from flask import Blueprint, request, jsonify, current_app
from config import get_db_connection, token_required
from mysql.connector import Error

portfolio_tabs_bp = Blueprint('portfolio_tabs', __name__)

# ==================== PORTFOLIO TABS ENDPOINTS ====================

@portfolio_tabs_bp.route('/api/portfolio-tabs', methods=['GET'])
@token_required
def get_portfolio_tabs(payload):
    """Get all portfolio tabs for the current user"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = "SELECT * FROM portfolio_tabs WHERE 1=1"
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
        current_app.logger.error('portfolio_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_tabs_bp.route('/api/portfolio-tabs', methods=['POST'])
@token_required
def create_portfolio_tab(payload):
    """Create a new portfolio tab"""
    try:
        owner = payload['username']
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute(
                "INSERT INTO portfolio_tabs (name, owner) VALUES (%s, %s)",
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
        current_app.logger.error('portfolio_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_tabs_bp.route('/api/portfolio-tabs/<int:tab_id>', methods=['PUT'])
@token_required
def update_portfolio_tab(payload, tab_id):
    """Rename a portfolio tab"""
    try:
        username = payload['username']
        user_role = payload['role']
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Tab name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: non-admin users can only modify their own tabs
            if user_role != 'admin' and tab['owner'] != username:
                return jsonify({'error': 'Access denied'}), 403

            # Update the tab
            cursor.execute(
                "UPDATE portfolio_tabs SET name = %s WHERE id = %s",
                (name, tab_id)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({'message': 'Tab updated successfully'})

    except Error as e:
        current_app.logger.error('portfolio_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


@portfolio_tabs_bp.route('/api/portfolio-tabs/<int:tab_id>', methods=['DELETE'])
@token_required
def delete_portfolio_tab(payload, tab_id):
    """Delete a portfolio tab and its associated entries"""
    try:
        username = payload['username']
        user_role = payload['role']

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # First verify ownership/authorization
            check_query = "SELECT owner FROM portfolio_tabs WHERE id = %s"
            cursor.execute(check_query, (tab_id,))
            tab = cursor.fetchone()

            if not tab:
                return jsonify({'error': 'Tab not found'}), 404

            # Authorization check: non-admin users can only delete their own tabs
            if user_role != 'admin' and tab['owner'] != username:
                return jsonify({'error': 'Access denied'}), 403

            # Delete associated portfolio entries first (CASCADE should handle this, but being explicit)
            cursor.execute(
                "DELETE FROM stock_portfolio WHERE tab_id = %s",
                (tab_id,)
            )
            deleted_entries = cursor.rowcount

            # Delete the tab
            cursor.execute(
                "DELETE FROM portfolio_tabs WHERE id = %s",
                (tab_id,)
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Tab not found'}), 404

            return jsonify({
                'message': f'Tab deleted with {deleted_entries} portfolio entries'
            })

    except Error as e:
        current_app.logger.error('portfolio_tabs db error: %s', e, exc_info=True)
        return jsonify({'error': 'A database error occurred'}), 500


