"""Unit tests for description normalisation rules."""
import pandas as pd
from il_bank_parser.description_rules import normalize_description_series, normalize_descriptions_df


class TestNormalizeDescriptionSeries:
    def test_airbnb(self):
        s = pd.Series(["AIRBNB PAYMENTS UK LIMITED payment"])
        assert normalize_description_series(s).iloc[0] == "Airbnb"

    def test_bit(self):
        s = pd.Series(["העברה מנועה אבן חשבון ב.הפועלים-ביט"])
        assert normalize_description_series(s).iloc[0] == "bit"

    def test_atm(self):
        s = pd.Series(["משיכה מכספומט כספונט 1234"])
        assert normalize_description_series(s).iloc[0] == "משיכת מזומן"

    def test_unmatched_passthrough(self):
        s = pd.Series(["some unknown merchant"])
        assert normalize_description_series(s).iloc[0] == "some unknown merchant"

    def test_nan_becomes_empty(self):
        s = pd.Series([None])
        result = normalize_description_series(s)
        assert result.iloc[0] == ""


class TestNormalizeDescriptionsDF:
    def test_applies_to_col(self):
        df = pd.DataFrame({"description": ["AIRBNB PAYMENTS UK LIMITED"], "amount": [100]})
        result = normalize_descriptions_df(df)
        assert result["description"].iloc[0] == "Airbnb"

    def test_missing_col_noop(self):
        df = pd.DataFrame({"amount": [100]})
        result = normalize_descriptions_df(df)
        assert "description" not in result.columns
