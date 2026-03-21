# il-bank-parser

A pip-installable Python library for parsing Israeli bank statement files (CSV and Excel).

Handles encoding detection, header-row scanning, Hebrew column names, date and amount normalisation, and description clean-up — with no dependency on Flask or any web framework.

---

## Supported formats

| Bank / Source | Format | Notes |
|---|---|---|
| Bank Hapoalim (עובר ושב) | XLSX / CSV | Deep header scan, future-transactions trimming |
| Leumi, Discount, Mizrahi | CSV / XLSX | Heuristic column detection |
| Isracard, Cal, Visa CAL | CSV / XLSX | Column-alignment fix for split date headers |
| Self-exported budget CSV | CSV | Round-trip: Type=Income/Expense + Notes column |
| Generic Israeli bank export | CSV / XLSX | Content-based fallback (dates, amounts, Hebrew text) |

---

## Installation

```bash
pip install il-bank-parser
```

Or directly from GitHub:

```bash
pip install git+https://github.com/your-org/il-bank-parser.git
```

For development:

```bash
git clone https://github.com/your-org/il-bank-parser.git
cd il-bank-parser
pip install -e ".[dev]"
```

To use with `bank_csv_normalizer` (optional, improves credit-card parsing):

```bash
pip install "il-bank-parser[normalizer]"
```

---

## Quick start

### Parse a bank statement into budget entries

```python
from il_bank_parser import parse_budget_file

entries = parse_budget_file("bank_export.xlsx")

for entry in entries:
    print(entry)
# {'type': 'income', 'description': 'Salary', 'amount': 5000.0,
#  'entry_date': '2024-01-15', 'category': None, 'notes': None}
# {'type': 'outcome', 'description': 'Groceries', 'amount': 150.0,
#  'entry_date': '2024-01-20', 'category': 'Food', 'notes': 'weekly shop'}
```

### Parse a credit card or bank transaction file

```python
from il_bank_parser import parse_transaction_file

df = parse_transaction_file("isracard_export.xlsx", transaction_type="credit")

print(df[["transaction_date", "description", "amount"]].head())
```

### Normalise a Poalim 'עובר ושב' export

```python
from il_bank_parser import normalize_poalim_osh_file_to_utf8_csv

report = normalize_poalim_osh_file_to_utf8_csv(
    input_path="hapoalim_osh.xlsx",
    output_csv="normalised.csv",
    apply_description_rules=True,
)

print(f"Rows in: {report.rows_in}, rows out: {report.rows_out}")
print(f"Dropped columns: {report.dropped_columns}")
```

### Use individual utilities

```python
from il_bank_parser.normalizers import parse_amount, parse_date
from il_bank_parser.description_rules import normalize_description_series
import pandas as pd

parse_amount("1,234.56")      # → 1234.56
parse_amount("₪500")          # → 500.0
parse_date("15/01/2024")      # → Timestamp('2024-01-15')

s = pd.Series(["AIRBNB PAYMENTS UK LIMITED"])
normalize_description_series(s)   # → ["Airbnb"]
```

---

## Module overview

```
il_bank_parser/
├── __init__.py          Public API (4 top-level exports)
├── loader.py            Load CSV/Excel — encoding detection, header-row scan
├── normalizers.py       parse_date, parse_amount, detect_date_order
├── columns.py           Column-name sets + detect_columns heuristic
├── description_rules.py Substring-based description normalisation
├── budget.py            parse_budget_file()
├── transactions.py      parse_transaction_file() — credit, debit, cash
└── formats/
    └── poalim_osh.py    normalize_poalim_osh_file_to_utf8_csv()
```

---

## Description rules

`description_rules.py` ships with a set of default rules for common Israeli payees (Airbnb, bit, ATM withdrawals, etc.). You can supply your own:

```python
from il_bank_parser.description_rules import normalize_description_series

my_rules = [
    (["NETFLIX"], "Netflix"),
    (["HOT MOBILE", "012 SMILE"], "HOT Mobile"),
]

normalize_description_series(series, rules=my_rules)
```

---

## Running tests

```bash
pip install -e ".[dev]"
pytest tests/ -v
```

27 tests covering amount parsing, date parsing, date-order detection, description rules, and full budget file round-trips including the self-export CSV format.

---

## Requirements

- Python ≥ 3.9
- pandas ≥ 1.5
- openpyxl ≥ 3.0
- xlrd ≥ 2.0

Optional: `bank-csv-normalizer` (improves credit-card file detection)

---

## License

MIT
