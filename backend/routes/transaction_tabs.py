from flask import Blueprint, request, jsonify
from config import get_db_connection
from mysql.connector import Error

transaction_tabs_bp = Blueprint('transaction_tabs', __name__)

# ==================== TRANSACTION TABS ENDPOINTS ====================

@transaction_tabs_bp.route('/api/transaction-tabs', methods=['GET'])
def get_transaction_tabs():
    """Get all transaction tabs for the current user"""
    try:
        username = request.args.get('username')
        user_role = request.args.get('role')

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
        return jsonify({'error': str(e)}), 500


@transaction_tabs_bp.route('/api/transaction-tabs', methods=['POST'])
def create_transaction_tab():
    """Create a new transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        owner = data.get('username')

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
        return jsonify({'error': str(e)}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['PUT'])
def update_transaction_tab(tab_id):
    """Rename a transaction tab"""
    try:
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
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
        return jsonify({'error': str(e)}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>', methods=['DELETE'])
def delete_transaction_tab(tab_id):
    """Delete a transaction tab and its associated transactions"""
    try:
        with get_db_connection() as connection:
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
        return jsonify({'error': str(e)}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/orphaned', methods=['GET'])
def get_orphaned_transaction_count():
    """Get count of transactions with no tab_id (orphaned from before tabs existed)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as count FROM bank_transactions WHERE tab_id IS NULL")
            result = cursor.fetchone()
            return jsonify({'count': result['count']})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@transaction_tabs_bp.route('/api/transaction-tabs/<int:tab_id>/adopt', methods=['POST'])
def adopt_orphaned_transactions(tab_id):
    """Assign all transactions with tab_id=NULL to the specified tab"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("UPDATE bank_transactions SET tab_id = %s WHERE tab_id IS NULL", (tab_id,))
            adopted_count = cursor.rowcount
            connection.commit()
            return jsonify({'message': f'{adopted_count} transactions assigned to tab', 'count': adopted_count})
    except Error as e:
        return jsonify({'error': str(e)}), 500



