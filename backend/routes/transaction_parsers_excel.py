import os
import re
import pandas as pd

_DATE_RE = re.compile(r'^\d{2}[./]\d{2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s|$)')


def _fix_credit_card_column_alignment(df):
    """
    Fix a common Israeli credit card CSV export issue.

    Some exports include both 'חיוב לתאריך' (billing date) and 'תאריך'
    (transaction date) as header columns, but the data rows only contain a
    single date value.  This causes every column after position 1 to be
    shifted by one position – 'תאריך' ends up holding business names, etc.

    Detection:  'חיוב לתאריך' sample looks like dates,
                'תאריך' sample does NOT look like dates.
    Fix:        remove 'חיוב לתאריך' from the column-name list and shift the
                remaining names one position to the left.
    """
    if 'חיוב לתאריך' not in df.columns or 'תאריך' not in df.columns:
        return df

    taarich_sample = df['תאריך'].dropna().head(5).astype(str).str.strip()
    if taarich_sample.str.match(_DATE_RE).any():
        return df  # properly aligned

    chiyuv_sample = df['חיוב לתאריך'].dropna().head(5).astype(str).str.strip()
    if not chiyuv_sample.str.match(_DATE_RE).any():
        return df  # can't confirm misalignment

    # Misalignment confirmed – shift column names
    cols = list(df.columns)
    idx = cols.index('חיוב לתאריך')
    cols.pop(idx)
    cols.append(f'_extra_{len(cols)}')
    df.columns = cols
    print(f"[NORMALIZER] Fixed column misalignment: removed 'חיוב לתאריך' "
          f"header, shifted columns", flush=True)
    return df


def _fallback_credit_parse(df):
    """
    Content-based fallback parser for when the normalizer returns 0 rows.
    Detects columns by their actual content (dates, numbers, text) rather
    than relying on header names.
    """
    date_col = None
    amount_col = None
    desc_col = None
    account_col = None

    for col_name in df.columns:
        sample = df[col_name].dropna().head(10).astype(str).str.strip()
        non_empty = sample[sample.ne('') & sample.ne('nan')]
        if non_empty.empty:
            continue

        # 4-digit card numbers
        if account_col is None and non_empty.str.match(r'^\d{4}$').mean() > 0.5:
            account_col = col_name
            continue

        # Date values
        if date_col is None and non_empty.str.match(_DATE_RE).mean() > 0.5:
            date_col = col_name
            continue

        # Numeric amounts
        if amount_col is None:
            numeric = pd.to_numeric(
                non_empty.str.replace(',', '', regex=False), errors='coerce'
            )
            if numeric.notna().mean() > 0.5:
                amount_col = col_name
                continue

        # Text with Hebrew or Latin letters → description
        if desc_col is None:
            if non_empty.str.contains(r'[\u0590-\u05FF]|[a-zA-Z]{3,}', regex=True).mean() > 0.3:
                desc_col = col_name

    if date_col is None:
        raise ValueError("Fallback parser: could not detect a date column")
    if amount_col is None:
        raise ValueError("Fallback parser: could not detect an amount column")

    print(f"[FALLBACK] Detected columns — date={date_col}, amount={amount_col}, "
          f"desc={desc_col}, account={account_col}", flush=True)

    transactions = []
    for _, row in df.iterrows():
        try:
            raw_val = row[date_col]
            # Excel cells read with dtype=str may still occasionally yield
            # a native Timestamp; handle that first.
            if isinstance(raw_val, (pd.Timestamp,)):
                transaction_date = raw_val
            else:
                date_str = str(raw_val).strip()
                if not date_str or date_str in ('nan', 'NaN', 'NaT'):
                    continue
                transaction_date = None
                # Try explicit formats — include the "%Y-%m-%d %H:%M:%S"
                # variant that Excel datetime-as-string produces ("2026-03-10 00:00:00").
                # It MUST come before the bare "%Y-%m-%d" and before the
                # dayfirst fallback which would misinterpret the ISO string.
                for fmt in ('%d.%m.%Y', '%d/%m/%Y', '%d/%m/%y', '%d.%m.%y',
                            '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
                    transaction_date = pd.to_datetime(date_str, format=fmt, errors='coerce')
                    if pd.notna(transaction_date):
                        break
                if pd.isna(transaction_date):
                    transaction_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.isna(transaction_date):
                continue

            amount_str = str(row[amount_col]).strip().replace(',', '')
            if not amount_str or amount_str in ('nan', 'NaN', ''):
                continue
            amount = float(amount_str)

            description = ''
            if desc_col and pd.notna(row[desc_col]):
                description = str(row[desc_col]).strip()
                if description in ('nan', 'NaN'):
                    description = ''

            account = ''
            if account_col and pd.notna(row[account_col]):
                account = str(row[account_col]).strip()
                if account in ('nan', 'NaN'):
                    account = ''

            transactions.append({
                'account_number': account,
                'transaction_date': transaction_date,
                'description': description,
                'amount': amount,
                'month_year': transaction_date.strftime('%Y-%m'),
                'transaction_type': 'credit',
            })
        except Exception:
            continue

    if not transactions:
        raise ValueError("Fallback parser: no valid transactions found")

    result = pd.DataFrame(transactions)
    result.attrs['normalizer_profile'] = 'fallback_content_detection'
    result.attrs['normalizer_confidence'] = 0.5
    print(f"[FALLBACK] Parsed {len(result)} transactions via content detection", flush=True)
    return result


def _load_excel_df(file_path):
    """
    Load an Excel bank export and return (df, header_row_index).

    Strategy: read the sheet twice.
    1. Read without a header to get all raw rows.
    2. Scan for the first row whose cells contain known Hebrew/English header
       keywords (תאריך, סכום, בית עסק, date, amount, …).
    3. Re-read with that row as the header so column names are correct.
    """
    HEADER_KEYWORDS = {
        "תאריך", "סכום", "תיאור", "תאור", "פרטים", "עסקה", "פעולה",
        "בית עסק", "כרטיס", "אסמכתא", "חובה", "זכות", "יתרה", "מנפיק",
        "date", "amount", "description", "transaction", "balance", "account",
    }

    # Read every cell as a string so we can search freely
    raw = pd.read_excel(file_path, sheet_name=0, header=None, dtype=str)

    header_row = 0  # sensible default
    best_hits = 0
    for i, row in raw.iterrows():
        cells = [str(c).strip().lower() for c in row if pd.notna(c) and str(c).strip()]
        hits = sum(1 for kw in HEADER_KEYWORDS if any(kw.lower() in c for c in cells))
        if hits > best_hits:
            best_hits = hits
            header_row = i
        if best_hits >= 3:   # good enough — stop early
            # but keep scanning a bit more in case a better row exists nearby
            if i > header_row + 5:
                break

    df = pd.read_excel(file_path, sheet_name=0, header=header_row, dtype=str)
    # Clean column names: strip whitespace AND collapse newlines / carriage
    # returns into single spaces.  Many Israeli bank exports (e.g. Cal/Visa)
    # use multi-line header cells like "תאריך\nעסקה" or "סכום\nבש\"ח".
    df.columns = [
        re.sub(r'[\r\n]+', ' ', str(c)).strip() for c in df.columns
    ]
    # Drop rows that are entirely NaN (trailing footer rows)
    df = df.dropna(how='all').reset_index(drop=True)
    return df, int(header_row)


_BALANCE_COL_NAMES = {'יתרה', '₪ יתרה', 'balance', 'יתרה בש"ח', 'יתרה ב-₪'}

def _extract_last_balance(df):
    """Return (last_balance: float, balance_date: str|None) from the DataFrame's balance column.

    Looks for a column whose name matches known Hebrew/English balance column names.
    Returns (None, None) if no balance column is found or all values are NaN.
    The 'last' balance is taken from the FIRST data row (bank exports list newest first).
    """
    bal_col = None
    for col in df.columns:
        col_clean = str(col).strip()
        if col_clean in _BALANCE_COL_NAMES or col_clean.lower() == 'balance':
            bal_col = col
            break
        # Partial match: column name contains יתרה
        if 'יתרה' in col_clean or 'balance' in col_clean.lower():
            bal_col = col
            break

    if bal_col is None:
        return None, None

    # Find date column for the balance date
    date_col = None
    for col in df.columns:
        col_clean = str(col).strip()
        if 'תאריך' in col_clean or col_clean.lower().startswith('date'):
            date_col = col
            break

    # Israeli bank exports are newest-first; take the first non-null balance row
    for i, row in df.iterrows():
        try:
            val = str(row[bal_col]).strip().replace(',', '')
            if val in ('', 'nan', 'NaN', 'None'):
                continue
            balance = float(val)
            date_str = None
            if date_col and pd.notna(row[date_col]):
                raw_date = str(row[date_col]).strip()
                parsed = pd.to_datetime(raw_date, dayfirst=True, errors='coerce')
                if pd.notna(parsed):
                    date_str = parsed.strftime('%Y-%m-%d')
            return balance, date_str
        except (ValueError, TypeError):
            continue

    return None, None
