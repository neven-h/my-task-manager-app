from flask import jsonify, current_app
from flask import Blueprint
from config import get_db_connection, token_required
from mysql.connector import Error

portfolio_delete_bp = Blueprint('portfolio_delete', __name__)


@portfolio_delete_bp.route('/api/portfolio/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_portfolio_entry(payload, entry_id):
    """Delete a portfolio entry"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT created_by FROM stock_portfolio WHERE id = %s"
            cursor.execute(check_query, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            # Authorization check: non-admin users can only delete their own entries
            if user_role != 'admin' and entry['created_by'] != username:
                return jsonify({'error': 'Access denied'}), 403

            # Delete the entry
            cursor.execute("DELETE FROM stock_portfolio WHERE id = %s", (entry_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Portfolio entry not found'}), 404

            return jsonify({'message': 'Portfolio entry deleted successfully'})

    except Error as e:
        current_app.logger.error('portfolio db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500
