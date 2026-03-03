import os
import pandas as pd
from routes.transaction_parsers import parse_cash_transaction_file


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
    df.columns = [str(c).strip() for c in df.columns]
    # Drop rows that are entirely NaN (trailing footer rows)
    df = df.dropna(how='all').reset_index(drop=True)
    return df, int(header_row)


def parse_transaction_file(file_path, transaction_type='credit'):
    """Parse CSV or Excel file using bank_csv_normalizer and return cleaned dataframe."""
    try:
        # Cash transactions still use the dedicated parser
        if transaction_type == 'cash':
            return parse_cash_transaction_file(file_path)

        from bank_csv_normalizer.normalize.io import load_csv
        from bank_csv_normalizer.convert import convert_df

        ext = os.path.splitext(file_path)[1].lower()
        print(f"\n{'=' * 60}", flush=True)
        print(f"[NORMALIZER] Parsing file: {file_path} (ext={ext})", flush=True)

        if ext in ('.xlsx', '.xls'):
            df, header_row_index = _load_excel_df(file_path)
            print(f"[NORMALIZER] Loaded {len(df)} rows from Excel, "
                  f"header_row={header_row_index}, columns={list(df.columns)[:6]}", flush=True)
        else:
            load_res = load_csv(file_path)
            df = load_res.df
            header_row_index = load_res.header_row_index
            print(f"[NORMALIZER] Loaded {len(df)} rows, encoding={load_res.encoding}, "
                  f"header_row={header_row_index}", flush=True)

        # Detect profile and produce canonical DataFrame
        canonical, report = convert_df(df)

        print(f"[NORMALIZER] Profile={report.profile} confidence={report.confidence:.2f} "
              f"rows_in={report.rows_in} rows_out={report.rows_out}", flush=True)
        if report.warnings:
            for w in report.warnings:
                print(f"[NORMALIZER] Warning: {w}", flush=True)

        if len(canonical) == 0:
            raise ValueError(
                f"No valid transactions found (profile={report.profile}, "
                f"warnings: {'; '.join(report.warnings)})"
            )

        # canonical columns: account_number, transaction_date (ISO str), description, amount (str)
        # Convert to the shape the rest of the endpoint expects
        canonical['transaction_date'] = pd.to_datetime(
            canonical['transaction_date'], format='%Y-%m-%d', errors='coerce'
        )
        canonical['amount'] = pd.to_numeric(canonical['amount'], errors='coerce')
        canonical = canonical.dropna(subset=['transaction_date', 'amount'])

        canonical['month_year'] = canonical['transaction_date'].dt.strftime('%Y-%m')
        canonical['transaction_type'] = transaction_type

        # Store report metadata on the df for the endpoint to expose
        canonical.attrs['normalizer_profile'] = report.profile
        canonical.attrs['normalizer_confidence'] = report.confidence

        print(f"[NORMALIZER] Successfully parsed {len(canonical)} credit transactions", flush=True)
        return canonical

    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")
