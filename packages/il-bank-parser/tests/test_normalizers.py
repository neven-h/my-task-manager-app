"""Unit tests for value-level normalizers."""
import pandas as pd
import pytest
from il_bank_parser.normalizers import parse_amount, parse_date, detect_date_order


class TestParseAmount:
    def test_plain_float(self):
        assert parse_amount("1234.56") == 1234.56

    def test_comma_separated(self):
        assert parse_amount("1,234.56") == 1234.56

    def test_shekel_sign(self):
        assert parse_amount("₪500") == 500.0

    def test_rtl_markers(self):
        assert parse_amount("\u200e100\u200f") == 100.0

    def test_negative(self):
        assert parse_amount("-250.00") == -250.0

    def test_nan_string(self):
        assert parse_amount("nan") is None

    def test_empty_string(self):
        assert parse_amount("") is None

    def test_pandas_na(self):
        assert parse_amount(pd.NA) is None


class TestParseDate:
    def test_dmy_slash(self):
        result = parse_date("15/01/2024", "dmy")
        assert result.year == 2024 and result.month == 1 and result.day == 15

    def test_dmy_dot(self):
        result = parse_date("15.01.2024", "dmy")
        assert result.year == 2024

    def test_iso_format(self):
        result = parse_date("2024-01-15", "dmy")
        assert result.year == 2024 and result.month == 1

    def test_excel_datetime_string(self):
        result = parse_date("2024-01-15 00:00:00", "dmy")
        assert result.year == 2024

    def test_nan_returns_nat(self):
        assert pd.isna(parse_date("nan"))

    def test_empty_returns_nat(self):
        assert pd.isna(parse_date(""))


class TestDetectDateOrder:
    def test_dmy(self):
        df = pd.DataFrame({"date": ["15/01/2024", "20/02/2024"]})
        assert detect_date_order(df, "date") == "dmy"

    def test_mdy(self):
        df = pd.DataFrame({"date": ["01/15/2024", "02/20/2024"]})
        assert detect_date_order(df, "date") == "mdy"
