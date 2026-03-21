import os
import pandas as pd
from routes.transaction_parsers import parse_cash_transaction_file
from .transaction_parsers_excel import (
    _fix_credit_card_column_alignment,
    _fallback_credit_parse,
    _load_excel_df,
    _extract_last_balance,
)


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

        # Extract real bank balance from יתרה / balance column before normalizer strips it
        _last_balance, _balance_date = _extract_last_balance(df)

        # Fix known column-alignment issues before the normalizer sees the data
        df = _fix_credit_card_column_alignment(df)

        # Detect profile and produce canonical DataFrame
        canonical, report = convert_df(df)

        print(f"[NORMALIZER] Profile={report.profile} confidence={report.confidence:.2f} "
              f"rows_in={report.rows_in} rows_out={report.rows_out}", flush=True)
        if report.warnings:
            for w in report.warnings:
                print(f"[NORMALIZER] Warning: {w}", flush=True)

        if len(canonical) == 0:
            print("[NORMALIZER] No rows from normalizer, trying fallback parser…",
                  flush=True)
            return _fallback_credit_parse(df)

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
        if _last_balance is not None:
            canonical.attrs['last_balance'] = _last_balance
            canonical.attrs['balance_date'] = _balance_date

        print(f"[NORMALIZER] Successfully parsed {len(canonical)} credit transactions", flush=True)
        return canonical

    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")
