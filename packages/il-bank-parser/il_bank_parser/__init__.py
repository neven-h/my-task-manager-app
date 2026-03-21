"""il-bank-parser — parse Israeli bank statement files (CSV/Excel).

Public API
----------
parse_budget_file(file_path)
    Parse any bank statement → list of budget entry dicts.

parse_transaction_file(file_path, transaction_type='credit')
    Parse credit/debit/cash exports → pandas DataFrame.

normalize_poalim_osh_file_to_utf8_csv(input_path, output_csv, ...)
    Normalize a Bank Hapoalim 'עובר ושב' export to a clean UTF-8 CSV.

NormalizeReport
    Dataclass returned by normalize_poalim_osh_file_to_utf8_csv.
"""

from il_bank_parser.budget import parse_budget_file
from il_bank_parser.transactions import parse_transaction_file
from il_bank_parser.formats.poalim_osh import (
    normalize_poalim_osh_file_to_utf8_csv,
    NormalizeReport,
)

__all__ = [
    "parse_budget_file",
    "parse_transaction_file",
    "normalize_poalim_osh_file_to_utf8_csv",
    "NormalizeReport",
]
