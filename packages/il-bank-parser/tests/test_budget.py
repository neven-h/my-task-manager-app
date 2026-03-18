"""Integration tests for parse_budget_file using in-memory CSV fixtures."""
import io
import os
import tempfile

import pytest
from il_bank_parser.budget import parse_budget_file


def _write_csv(content: str) -> str:
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8')
    f.write(content)
    f.close()
    return f.name


class TestParseBudgetFile:
    def test_basic_income_and_expense(self):
        path = _write_csv(
            "Date,Description,Amount\n"
            "15/01/2024,Salary,5000\n"
            "20/01/2024,Groceries,-150\n"
        )
        try:
            entries = parse_budget_file(path)
        finally:
            os.unlink(path)

        assert len(entries) == 2
        income = [e for e in entries if e['type'] == 'income']
        expense = [e for e in entries if e['type'] == 'outcome']
        assert len(income) == 1 and income[0]['amount'] == 5000.0
        assert len(expense) == 1 and expense[0]['amount'] == 150.0

    def test_self_export_round_trip(self):
        """CSV exported from the budget tab must parse back correctly."""
        path = _write_csv(
            "Date,Type,Description,Amount,Category,Notes\n"
            "2024-01-15,Income,Salary,5000.00,,\n"
            "2024-01-20,Expense,Groceries,150.00,Food,weekly shop\n"
        )
        try:
            entries = parse_budget_file(path)
        finally:
            os.unlink(path)

        income  = [e for e in entries if e['type'] == 'income']
        expense = [e for e in entries if e['type'] == 'outcome']
        assert len(income) == 1
        assert len(expense) == 1
        assert expense[0]['category'] == 'Food'
        assert expense[0]['notes'] == 'weekly shop'

    def test_no_date_column_raises(self):
        path = _write_csv("Description,Amount\nSalary,5000\n")
        try:
            with pytest.raises(ValueError, match="date column"):
                parse_budget_file(path)
        finally:
            os.unlink(path)

    def test_credit_debit_columns(self):
        path = _write_csv(
            "Date,Description,Credit,Debit\n"
            "15/01/2024,Salary,5000,\n"
            "20/01/2024,Rent,,1200\n"
        )
        try:
            entries = parse_budget_file(path)
        finally:
            os.unlink(path)

        assert any(e['type'] == 'income' for e in entries)
        assert any(e['type'] == 'outcome' for e in entries)
