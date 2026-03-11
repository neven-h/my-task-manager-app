import os
import pandas as pd


def clean_transaction_data(df):
    """Clean transaction data from uploaded file"""
    print(f"[CLEAN] Before cleaning: {len(df)} rows", flush=True)

    # Remove rows where all columns are empty
    df = df.dropna(how='all')
    print(f"[CLEAN] After removing empty rows: {len(df)} rows", flush=True)

    # Don't drop rows based on columns yet - let the main parser handle it
    # Just remove completely empty rows

    # Reset index
    df = df.reset_index(drop=True)

    print(f"[CLEAN] First 3 rows after cleaning:", flush=True)
    for i in range(min(3, len(df))):
        print(f"  Row {i}: {df.iloc[i].tolist()}", flush=True)

    return df


def parse_cash_transaction_file(file_path):
    """Parse CSV file for cash transactions (handles header row and different column orders)"""
    try:
        print(f"\n{'=' * 60}", flush=True)
        print(f"[CASH TRANSACTIONS] Starting to parse file", flush=True)

        # Try Hebrew encodings
        encodings_to_try = ['utf-8-sig', 'utf-8', 'windows-1255', 'cp1255', 'iso-8859-8']

        df = None
        for encoding in encodings_to_try:
            try:
                # Read with header to check column names
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"[SUCCESS] Read cash CSV with encoding: {encoding}", flush=True)
                print(f"[COLUMNS] Found columns: {list(df.columns)}", flush=True)
                break
            except Exception as e:
                print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                continue

        if df is None:
            df = pd.read_csv(file_path, encoding='utf-8', errors='replace')

        # Remove completely empty rows
        df = df.dropna(how='all')

        # Filter out rows that are totals (contain "סה״כ" anywhere)
        for col in df.columns:
            df = df[~df[col].astype(str).str.contains('סה״כ', na=False)]

        print(f"[CLEAN] After removing totals: {len(df)} rows", flush=True)

        if len(df) == 0:
            raise ValueError("No valid transactions found in file")

        # Try to identify columns by content or header names
        # Common Hebrew headers: שם כרטיס (card), תאריך (date), שם בית עסק (business), סכום קנייה (amount)
        date_col = None
        amount_col = None
        desc_col = None
        account_col = None

        # Check column headers for Hebrew names
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if 'תאריך' in col_str or 'date' in col_str.lower():
                date_col = i
            elif 'סכום' in col_str or 'amount' in col_str.lower():
                amount_col = i
            elif 'בית עסק' in col_str or 'description' in col_str.lower() or 'עסק' in col_str:
                desc_col = i
            elif 'כרטיס' in col_str or 'חשבון' in col_str or 'account' in col_str.lower():
                account_col = i

        # If headers didn't work, try to detect by content
        if date_col is None:
            date_pattern = r'\d{2}\.\d{2}\.\d{4}'
            for i in range(len(df.columns)):
                sample_values = df.iloc[:5, i].astype(str)
                if sample_values.str.match(date_pattern).any():
                    date_col = i
                    break

        if amount_col is None:
            for i in range(len(df.columns)):
                if i == date_col:
                    continue
                sample_values = df.iloc[:5, i].astype(str).str.replace(',', '').str.replace('"', '')
                try:
                    pd.to_numeric(sample_values, errors='raise')
                    amount_col = i
                    break
                except:
                    continue

        # Default assignments if still not found
        if date_col is None:
            date_col = 1  # Common position for date
        if amount_col is None:
            amount_col = 3  # Common position for amount
        if desc_col is None:
            desc_col = 2  # Common position for description
        if account_col is None:
            account_col = 0  # Common position for account

        print(f"[COLUMNS] Using: date={date_col}, amount={amount_col}, desc={desc_col}, account={account_col}",
              flush=True)

        # Create structured dataframe
        transactions = []
        for idx, row in df.iterrows():
            try:
                # Get date
                date_str = str(row.iloc[date_col]).strip()
                # Skip if not a valid date
                if not pd.notna(row.iloc[date_col]) or date_str in ['', 'nan', 'NaN']:
                    continue

                transaction_date = None
                for dfmt in ['%d.%m.%Y', '%d/%m/%Y', '%d/%m/%y', '%d.%m.%y',
                            '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
                    transaction_date = pd.to_datetime(date_str, format=dfmt, errors='coerce')
                    if pd.notna(transaction_date):
                        break
                if pd.isna(transaction_date):
                    # Final fallback: let pandas infer
                    transaction_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                if pd.isna(transaction_date):
                    print(f"[SKIP] Row {idx}: Invalid date '{date_str}'", flush=True)
                    continue

                # Get amount (remove commas and quotes)
                amount_str = str(row.iloc[amount_col]).strip().replace(',', '').replace('"', '')
                if not amount_str or amount_str in ['nan', 'NaN', '']:
                    continue
                amount = float(amount_str)

                # Get description
                description = str(row.iloc[desc_col]).strip() if pd.notna(row.iloc[desc_col]) else 'משיכת מזומן'
                if description in ['nan', 'NaN', '']:
                    description = 'משיכת מזומן'

                # Get account number
                account_number = str(row.iloc[account_col]).strip() if pd.notna(row.iloc[account_col]) else ''
                if account_number in ['nan', 'NaN']:
                    account_number = ''

                # Month year
                month_year = transaction_date.strftime('%Y-%m')

                transactions.append({
                    'transaction_date': transaction_date,
                    'amount': amount,
                    'account_number': account_number,
                    'description': description,
                    'month_year': month_year,
                    'transaction_type': 'cash'
                })
                print(f"[PARSED] {transaction_date.strftime('%Y-%m-%d')}: {description} = {amount}", flush=True)
            except Exception as e:
                print(f"[SKIP ROW {idx}] Error: {e}", flush=True)
                continue

        if not transactions:
            raise ValueError("No valid transactions could be parsed from the file")

        result_df = pd.DataFrame(transactions)
        print(f"[CASH TRANSACTIONS] Successfully parsed {len(result_df)} transactions", flush=True)

        return result_df

    except Exception as e:
        print(f"[ERROR] Cash transaction parsing failed: {str(e)}", flush=True)
        raise ValueError(f"Error parsing cash transaction file: {str(e)}")
