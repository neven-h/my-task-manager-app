"""Export budget entries to CSV."""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, send_file, current_app
from config import get_db_connection, sanitize_csv_field, token_required
from mysql.connector import Error

import csv
import io

logger = logging.getLogger(__name__)

budget_export_bp = Blueprint('budget_export', __name__)


@budget_export_bp.route('/api/export/budget/csv', methods=['GET'])
@token_required
def export_budget_csv(payload):
    """Export budget entries to CSV (scoped by owner, optionally by tab)."""
    try:
        username = payload['username']
        tab_id = request.args.get('tab_id')

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                SELECT entry_date, type, description, amount, category, notes
                FROM budget_entries
                WHERE owner = %s
            """
            params = [username]

            if tab_id:
                query += " AND tab_id = %s"
                params.append(tab_id)

            query += " ORDER BY entry_date ASC, id ASC"

            cursor.execute(query, params)
            rows = cursor.fetchall()

        if not rows:
            return jsonify({'error': 'No budget entries found'}), 404

        output = io.StringIO()
        fieldnames = ['Date', 'Type', 'Description', 'Amount', 'Category', 'Notes']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for row in rows:
            entry_date = row['entry_date']
            if hasattr(entry_date, 'strftime'):
                entry_date = entry_date.strftime('%Y-%m-%d')
            else:
                entry_date = str(entry_date) if entry_date else ''

            writer.writerow({
                'Date': sanitize_csv_field(entry_date),
                'Type': sanitize_csv_field(
                    'Income' if row['type'] == 'income' else 'Expense'
                ),
                'Description': sanitize_csv_field(row.get('description', '')),
                'Amount': sanitize_csv_field(row.get('amount', 0)),
                'Category': sanitize_csv_field(row.get('category', '')),
                'Notes': sanitize_csv_field(row.get('notes', '')),
            })

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            mimetype='text/csv; charset=utf-8',
            as_attachment=True,
            download_name=f'budget_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        )

    except Error as e:
        logger.error('budget_export db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
    except Exception as e:
        logger.error('budget_export error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to export budget'}), 500
