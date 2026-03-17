from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

transaction_tabs_bp = Blueprint('transaction_tabs', __name__)

# ==================== TRANSACTION TABS ENDPOINTS ====================

@transaction_tabs_bp.route('/api/transaction-tabs', methods=['GET'])
@token_required
def get_transaction_tabs(payload):
    """Get all transaction tabs for the current user"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            if user_role == 'admin':
                query = "SELECT * FROM transaction_tabs WHERE owner = %s OR owner IS NULL"
            else:
                query = "SELECT * FROM transaction_tabs WHERE owner = %s"
            params = [username]

            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            tabs = cursor.fetchall()

            for tab in tabs:
                if tab.get('created_at'):
                    tab['created_at'] = tab['created_at'].isoformat()

            return jsonify(tabs)

    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_bp.route('/api/transaction-tabs', methods=['POST'])
@token_required
def create_transaction_tab(payload):
    """Create a new transaction tab"""
    try:
        owner = payload['username']
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)",
                (name, owner)
            )
            connection.commit()

            tab_id = cursor.lastrowid
            return jsonify({
                'id': tab_id,
                'name': name,
                'owner': owner,
                'message': 'Tab created successfully'
            })

    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['PUT'])
@token_required
def update_transaction_tab(payload, tab_id):
    """Rename a transaction tab"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check
            cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if tab['owner'] != username:
                return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute(
                "UPDATE transaction_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>/duplicate', methods=['POST'])
@token_required
def duplicate_transaction_tab(payload, tab_id):
    """Create a copy of a tab and all its transactions."""
    try:
        username = payload['username']
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM transaction_tabs WHERE id = %s AND owner = %s", (tab_id, username))
            source = cursor.fetchone()
            if not source:
                return jsonify({'error': 'Tab not found'}), 404
            new_name = source['name'] + ' (copy)'
            cursor.execute("INSERT INTO transaction_tabs (name, owner) VALUES (%s, %s)", (new_name, username))
            connection.commit()
            new_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO bank_transactions "
                "  (account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, tab_id) "
                "SELECT account_number, transaction_date, description, amount, month_year, transaction_type, uploaded_by, %s "
                "FROM bank_transactions WHERE tab_id = %s",
                (new_id, tab_id),
            )
            connection.commit()
            cursor.execute("SELECT * FROM transaction_tabs WHERE id = %s", (new_id,))
            new_tab = cursor.fetchone()
            if new_tab.get('created_at'):
                new_tab['created_at'] = new_tab['created_at'].isoformat()
        return jsonify(new_tab), 201
    except Error as e:
        current_app.logger.error('duplicate_transaction_tab db error: %s', e)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['DELETE'])
@token_required
def delete_transaction_tab(payload, tab_id):
    """Delete a transaction tab and its associated transactions"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check
            cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
            tab = cursor.fetchone()
            if not tab:
                return jsonify({'error': 'Tab not found'}), 404
            if tab['owner'] != username:
                return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()

            # Delete associated transactions first
            cursor.execute(
                "DELETE FROM bank_transactions WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_transactions = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM transaction_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_transactions} transactions'
            })

    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


