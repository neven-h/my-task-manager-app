"""The web process must not set up the database on import.

Schema setup and the rekey pass run once per deploy (db_setup.py). Run on
import, they ran in every gunicorn process before it could answer the health
check, and the deploy failed (2026-10-24: ~34 s against Railway's 30 s).
"""
import ast
import glob
import os
import unittest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _module_level_calls(path):
    """Names called at import time: module-level statements, try blocks
    included, but not function bodies or `if __name__ == '__main__'`."""
    with open(path, encoding='utf-8') as source:
        tree = ast.parse(source.read())
    names = set()
    pending = list(tree.body)
    while pending:
        node = pending.pop()
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        if isinstance(node, ast.If) and '__main__' in ast.unparse(node.test):
            continue
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            names.add(node.func.id)
        pending.extend(ast.iter_child_nodes(node))
    return names


class TestNoDatabaseSetupOnImport(unittest.TestCase):
    def test_no_module_runs_init_db_on_import(self):
        modules = [os.path.join(BACKEND, 'app.py')] + glob.glob(os.path.join(BACKEND, 'routes', '*.py'))
        offenders = [os.path.relpath(m, BACKEND) for m in modules if 'init_db' in _module_level_calls(m)]
        self.assertEqual(offenders, [])


if __name__ == '__main__':
    unittest.main()
