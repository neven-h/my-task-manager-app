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

            query = "SELECT * FROM transaction_tabs WHERE 1=1"
            params = []

            if user_role == 'limited':
                query += " AND owner = %s"
                params.append(username)

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
            if user_role != 'admin':
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
            if user_role != 'admin':
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


@transaction_tabs_bp.route('/api/transaction-tabs/orphaned', methods=['GET'])
@token_required
def get_orphaned_transaction_count(payload):
    """Get count of transactions with no tab_id (orphaned from before tabs existed)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
            result = cursor.fetchone()
            return jsonify({'count': result['count']})
    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>/adopt', methods=['POST'])
@token_required
def adopt_orphaned_transactions(payload, tab_id):
    """Assign all transactions with tab_id=NULL to the specified tab"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Ownership check: verify tab belongs to requesting user
            if user_role != 'admin':
                cursor.execute("SELECT owner FROM transaction_tabs WHERE id = %s", (tab_id,))
                tab = cursor.fetchone()
                if not tab:
                    return jsonify({'error': 'Tab not found'}), 404
                if tab['owner'] != username:
                    return jsonify({'error': 'Access denied'}), 403

            cursor = connection.cursor()
            cursor.execute("UPDATE bank_transactions SET tab_id = %s WHERE tab_id IS NULL", (tab_id,))
            adopted_count = cursor.rowcount
            connection.commit()
            return jsonify({'message': f'{adopted_count} transactions assigned to tab', 'count': adopted_count})
    except Error as e:
        current_app.logger.error('transaction_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500



