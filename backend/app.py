from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import csv
import io
import os
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS - allow frontend origins
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3004')
CORS(app, origins=[FRONTEND_URL, 'http://localhost:3004', 'https://drpitz.club', 'https://www.drpitz.club'])

# Database configuration - uses environment variables in production, defaults for local dev
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'task_tracker'),
    'port': int(os.getenv('DB_PORT', 3306))
}

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    connection = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()

def init_db():
    """Initialize database and create tables"""
    try:
        # Connect without database to create it
        temp_config = DB_CONFIG.copy()
        db_name = temp_config.pop('database')
        
        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        
        # Create tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL,
                client VARCHAR(255),
                task_date DATE NOT NULL,
                task_time TIME,
                duration DECIMAL(5,2),
                status ENUM('completed', 'uncompleted') DEFAULT 'uncompleted',
                categories TEXT,
                tags TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date (task_date),
                INDEX idx_category (category),
                INDEX idx_status (status),
                INDEX idx_client (client),
                FULLTEXT idx_search (title, description, notes)
            )
        """)
        
        connection.commit()
        print("Database initialized successfully")
        
    except Error as e:
        print(f"Error initializing database: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks with optional filtering"""
    try:
        # Get query parameters
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Build query
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []
            
            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)
            
            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)
            
            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")
            
            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])
            
            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)
            
            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)
            
            query += " ORDER BY task_date DESC, task_time DESC, created_at DESC"
            
            cursor.execute(query, params)
            tasks = cursor.fetchall()
            
            # Convert datetime objects to strings and tags to array
            for task in tasks:
                if task['task_date']:
                    task['task_date'] = task['task_date'].isoformat()
                if task['task_time']:
                    task['task_time'] = str(task['task_time'])
                if task['created_at']:
                    task['created_at'] = task['created_at'].isoformat()
                if task['updated_at']:
                    task['updated_at'] = task['updated_at'].isoformat()
                if task['duration']:
                    task['duration'] = float(task['duration'])
                # Convert tags from comma-separated string to array
                if task.get('tags'):
                    task['tags'] = [t.strip() for t in task['tags'].split(',') if t.strip()]
                else:
                    task['tags'] = []
                # Convert categories from comma-separated string to array
                if task.get('categories'):
                    task['categories'] = [c.strip() for c in task['categories'].split(',') if c.strip()]
                else:
                    task['categories'] = [task.get('category', 'other')]
            
            return jsonify(tasks)
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.json
        
        # Set default time to current time if not provided
        task_time = data.get('task_time')
        if not task_time:
            task_time = datetime.now().strftime('%H:%M:%S')
        
        with get_db_connection() as connection:
            cursor = connection.cursor()
            
            query = """
                INSERT INTO tasks 
                (title, description, category, categories, client, task_date, task_time, 
                 duration, status, tags, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]  # First category is primary
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')
            
            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_str = ','.join(tags) if isinstance(tags, list) else tags
            
            values = (
                data['title'],
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data['task_date'],
                task_time,
                data.get('duration'),
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', '')
            )
            
            cursor.execute(query, values)
            connection.commit()
            
            task_id = cursor.lastrowid
            
            return jsonify({
                'id': task_id,
                'message': 'Task created successfully'
            }), 201
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update an existing task"""
    try:
        data = request.json
        
        with get_db_connection() as connection:
            cursor = connection.cursor()
            
            query = """
                UPDATE tasks 
                SET title = %s, description = %s, category = %s, categories = %s, client = %s,
                    task_date = %s, task_time = %s, duration = %s, 
                    status = %s, tags = %s, notes = %s
                WHERE id = %s
            """
            
            # Handle categories - convert list to comma-separated string
            categories_list = data.get('categories', [])
            if isinstance(categories_list, list) and len(categories_list) > 0:
                categories_str = ','.join(categories_list)
                primary_category = categories_list[0]
            else:
                categories_str = data.get('category', 'other')
                primary_category = data.get('category', 'other')
            
            # Handle tags - convert list to comma-separated string
            tags = data.get('tags', [])
            tags_str = ','.join(tags) if isinstance(tags, list) else tags
            
            values = (
                data['title'],
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data['task_date'],
                data.get('task_time'),
                data.get('duration'),
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                task_id
            )
            
            cursor.execute(query, values)
            connection.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404
            
            return jsonify({'message': 'Task updated successfully'})
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            
            cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            connection.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Task not found'}), 404
            
            return jsonify({'message': 'Task deleted successfully'})
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>/toggle-status', methods=['PATCH'])
def toggle_task_status(task_id):
    """Toggle task completion status"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            
            # Get current status
            cursor.execute("SELECT status FROM tasks WHERE id = %s", (task_id,))
            result = cursor.fetchone()
            
            if not result:
                return jsonify({'error': 'Task not found'}), 404
            
            # Toggle between completed and uncompleted
            current_status = result[0]
            new_status = 'completed' if current_status == 'uncompleted' else 'uncompleted'
            
            cursor.execute(
                "UPDATE tasks SET status = %s WHERE id = %s",
                (new_status, task_id)
            )
            connection.commit()
            
            return jsonify({
                'message': 'Status updated successfully',
                'status': new_status
            })
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export tasks to CSV"""
    try:
        # Get filtering parameters (same as get_tasks)
        category = request.args.get('category')
        status = request.args.get('status')
        client = request.args.get('client')
        search = request.args.get('search')
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Build query (same logic as get_tasks)
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []
            
            if category and category != 'all':
                query += " AND category = %s"
                params.append(category)
            
            if status and status != 'all':
                query += " AND status = %s"
                params.append(status)
            
            if client:
                query += " AND client LIKE %s"
                params.append(f"%{client}%")
            
            if search:
                query += " AND (title LIKE %s OR description LIKE %s OR notes LIKE %s)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])
            
            if date_start:
                query += " AND task_date >= %s"
                params.append(date_start)
            
            if date_end:
                query += " AND task_date <= %s"
                params.append(date_end)
            
            query += " ORDER BY task_date DESC, task_time DESC"
            
            cursor.execute(query, params)
            tasks = cursor.fetchall()
            
            # Create CSV
            output = io.StringIO()
            if tasks:
                fieldnames = tasks[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(tasks)
            
            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about tasks"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Overall stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                    SUM(CASE WHEN status = 'uncompleted' THEN 1 ELSE 0 END) as uncompleted_tasks,
                    SUM(duration) as total_duration
                FROM tasks
            """)
            overall = cursor.fetchone()
            
            # Stats by category
            cursor.execute("""
                SELECT 
                    category,
                    COUNT(*) as count,
                    SUM(duration) as total_duration,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM tasks
                GROUP BY category
                ORDER BY count DESC
            """)
            by_category = cursor.fetchall()
            
            # Stats by client
            cursor.execute("""
                SELECT 
                    client,
                    COUNT(*) as count,
                    SUM(duration) as total_duration
                FROM tasks
                WHERE client IS NOT NULL AND client != ''
                GROUP BY client
                ORDER BY count DESC
                LIMIT 10
            """)
            by_client = cursor.fetchall()
            
            # Monthly stats
            cursor.execute("""
                SELECT 
                    DATE_FORMAT(task_date, '%Y-%m') as month,
                    COUNT(*) as count,
                    SUM(duration) as total_duration
                FROM tasks
                GROUP BY month
                ORDER BY month DESC
                LIMIT 12
            """)
            monthly = cursor.fetchall()
            
            # Convert Decimal to float
            if overall['total_duration']:
                overall['total_duration'] = float(overall['total_duration'])
            
            for item in by_category:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])
            
            for item in by_client:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])
            
            for item in monthly:
                if item['total_duration']:
                    item['total_duration'] = float(item['total_duration'])
            
            return jsonify({
                'overall': overall,
                'by_category': by_category,
                'by_client': by_client,
                'monthly': monthly
            })
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get list of predefined categories"""
    categories = [
        {'id': 'insurance', 'label': 'Insurance Lawsuits'},
        {'id': 'emails', 'label': 'Email Management'},
        {'id': 'customer-support', 'label': 'Customer Support'},
        {'id': 'banking', 'label': 'Bank Accounts'},
        {'id': 'scheduling', 'label': 'Scheduling'},
        {'id': 'documentation', 'label': 'Documentation'},
        {'id': 'phone-calls', 'label': 'Phone Calls'},
        {'id': 'research', 'label': 'Research'},
        {'id': 'nursing', 'label': 'Nursing'},
        {'id': 'moshe', 'label': 'Moshe'},
        {'id': 'other', 'label': 'Other Tasks'}
    ]
    return jsonify(categories)

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Get list of unique clients"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            
            cursor.execute("""
                SELECT DISTINCT client 
                FROM tasks 
                WHERE client IS NOT NULL AND client != ''
                ORDER BY client
            """)
            
            clients = [row[0] for row in cursor.fetchall()]
            return jsonify(clients)
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)