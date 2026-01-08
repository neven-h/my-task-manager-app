from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import csv
import io
from contextlib import contextmanager
import pandas as pd
from werkzeug.utils import secure_filename
import os
import chardet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS - allow frontend origins
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3004')
CORS(app, origins=[FRONTEND_URL, 'http://localhost:3004', 'http://localhost:3005', 'https://drpitz.club', 'https://www.drpitz.club'])

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

def sanitize_csv_field(value):
    """
    Sanitize a field for CSV export to prevent CSV/Formula injection.
    If the value is a string and begins with one of the dangerous characters
    (=, +, -, @, tab, carriage return, line feed), a single quote is prepended.
    Double quotes within the value are escaped by doubling them.
    """
    if isinstance(value, str):
        if value and value[0] in ('=', '+', '-', '@', '\t', '\r', '\n'):
            value = "'" + value
        return value.replace('"', '""')
    return value


# Database configuration - uses environment variables in production, defaults for local dev
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'task_tracker'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# User credentials loaded from environment variables
# USERS = {
#     'pitz': {'password': os.getenv('USER_PITZ_PASSWORD', 'default_password'), 'role': 'admin'},
#     'benny': {'password': os.getenv('USER_BENNY_PASSWORD', 'default_password'), 'role': 'shared'}
# }
# User credentials loaded from environment variables
USERS = {
    'pitz': {'password': os.getenv('USER_PITZ_PASSWORD', 'default_password'), 'role': 'admin'},
    'benny': {'password': os.getenv('USER_BENNY_PASSWORD', 'default_password'), 'role': 'shared'}
}

if not os.getenv('USER_PITZ_PASSWORD') or not os.getenv('USER_BENNY_PASSWORD'):
    raise ValueError("USER_PITZ_PASSWORD and USER_BENNY_PASSWORD must be set")

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
                shared BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date (task_date),
                INDEX idx_category (category),
                INDEX idx_status (status),
                INDEX idx_client (client),
                INDEX idx_shared (shared),
                FULLTEXT idx_search (title, description, notes)
            )
        """)
        
        # Add shared column if it doesn't exist (for existing databases)
        try:
            cursor.execute("""
                ALTER TABLE tasks 
                ADD COLUMN shared BOOLEAN DEFAULT FALSE
            """)
            print("Added shared column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")
        
        # Add index for shared column if it doesn't exist
        try:
            cursor.execute("CREATE INDEX idx_shared ON tasks(shared)")
            print("Added index for shared column")
        except Error as e:
            if 'Duplicate' in str(e):
                pass  # Index already exists
            else:
                print(f"Note: {e}")

        # Add is_draft column for draft/auto-save functionality
        try:
            cursor.execute("""
                ALTER TABLE tasks
                ADD COLUMN is_draft BOOLEAN DEFAULT FALSE
            """)
            print("Added is_draft column to tasks")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Add index for draft column
        try:
            cursor.execute("CREATE INDEX idx_draft ON tasks(is_draft)")
            print("Added index for is_draft column")
        except Error as e:
            if 'Duplicate' in str(e):
                pass  # Index already exists
            else:
                print(f"Note: {e}")

        # Create bank_transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bank_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_number VARCHAR(50),
                transaction_date DATE NOT NULL,
                description VARCHAR(500) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                month_year VARCHAR(7) NOT NULL,
                transaction_type ENUM('credit', 'cash') DEFAULT 'credit',
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_transaction_date (transaction_date),
                INDEX idx_month_year (month_year),
                INDEX idx_account (account_number),
                INDEX idx_transaction_type (transaction_type)
            )
        """)
        
        # Add transaction_type column if it doesn't exist (for existing databases)
        try:
            cursor.execute("""
                ALTER TABLE bank_transactions
                ADD COLUMN transaction_type ENUM('credit', 'cash') DEFAULT 'credit'
            """)
            print("Added transaction_type column to bank_transactions")
        except Error as e:
            if 'Duplicate column' in str(e):
                pass  # Column already exists
            else:
                print(f"Note: {e}")

        # Create tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                color VARCHAR(7) DEFAULT '#0d6efd',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_name (name)
            )
        """)

        # Create categories_master table for user-defined categories
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id VARCHAR(50) NOT NULL UNIQUE,
                label VARCHAR(100) NOT NULL,
                color VARCHAR(7) DEFAULT '#0d6efd',
                icon VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_category_id (category_id)
            )
        """)

        # Insert default categories if table is empty
        cursor.execute("SELECT COUNT(*) FROM categories_master")
        if cursor.fetchone()[0] == 0:
            default_categories = [
                ('insurance', 'Insurance Lawsuits', '#0d6efd', '⚖️'),
                ('emails', 'Email Management', '#6610f2', '📧'),
                ('customer-support', 'Customer Support', '#0dcaf0', '🎧'),
                ('banking', 'Bank Accounts', '#198754', '🏦'),
                ('scheduling', 'Scheduling', '#ffc107', '📅'),
                ('documentation', 'Documentation', '#fd7e14', '📄'),
                ('phone-calls', 'Phone Calls', '#20c997', '📞'),
                ('research', 'Research', '#6f42c1', '🔍'),
                ('nursing', 'Nursing', '#d63384', '⚕️'),
                ('moshe', 'Moshe', '#dc3545', '👤'),
                ('other', 'Other Tasks', '#6c757d', '📝')
            ]
            cursor.executemany("""
                INSERT INTO categories_master (category_id, label, color, icon)
                VALUES (%s, %s, %s, %s)
            """, default_categories)
            print("Inserted default categories")

        # Create clients table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255),
                phone VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name)
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

@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate user and return role"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if username in USERS and USERS[username]['password'] == password:
            return jsonify({
                'success': True,
                'username': username,
                'role': USERS[username]['role'],
                'token': f'auth-token-{username}-{datetime.now().timestamp()}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        shared_only = request.args.get('shared')  # For limited users (benny)
        include_drafts = request.args.get('include_drafts', 'false')  # Include drafts

        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Build query
            query = "SELECT * FROM tasks WHERE 1=1"
            params = []

            # Exclude drafts by default unless explicitly requested
            if include_drafts != 'true':
                query += " AND (is_draft = FALSE OR is_draft IS NULL)"

            # If shared_only is true, only return shared tasks
            if shared_only == 'true':
                query += " AND shared = TRUE"
            
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
                tags_value = task.get('tags')
                if tags_value:
                    task['tags'] = [t.strip() for t in tags_value.split(',') if t.strip()]
                else:
                    task['tags'] = []
                # Convert categories from comma-separated string to array
                categories_value = task.get('categories')
                if categories_value:
                    task['categories'] = [c.strip() for c in categories_value.split(',') if c.strip()]
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
                 duration, status, tags, notes, shared, is_draft)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                task_time,
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False))
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
                    status = %s, tags = %s, notes = %s, shared = %s, is_draft = %s
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

            # Handle duration - convert empty string to None/NULL
            duration = data.get('duration')
            if duration == '' or duration is None:
                duration = None

            values = (
                data.get('title', 'Untitled'),
                data.get('description', ''),
                primary_category,
                categories_str,
                data.get('client', ''),
                data.get('task_date', datetime.now().date()),
                data.get('task_time'),
                duration,
                data.get('status', 'uncompleted'),
                tags_str,
                data.get('notes', ''),
                bool(data.get('shared', False)),
                bool(data.get('is_draft', False)),
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

@app.route('/api/tasks/<int:task_id>/duplicate', methods=['POST'])
def duplicate_task(task_id):
    """Duplicate an existing task"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            # Get the original task
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            original_task = cursor.fetchone()

            if not original_task:
                return jsonify({'error': 'Task not found'}), 404

            # Create a duplicate with modified title and today's date
            cursor = connection.cursor()
            query = """
                INSERT INTO tasks
                (title, description, category, categories, client, task_date, task_time,
                 duration, status, tags, notes, shared, is_draft)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            # Add "Copy of" prefix to title
            new_title = f"Copy of {original_task['title']}"

            # Use today's date and current time
            today = datetime.now().date()
            current_time = datetime.now().time()

            values = (
                new_title,
                original_task['description'],
                original_task['category'],
                original_task['categories'],
                original_task['client'],
                today,
                current_time,
                original_task['duration'],
                'uncompleted',  # New tasks start as uncompleted
                original_task['tags'],
                original_task['notes'],
                original_task['shared'],
                False  # Duplicates should not be created as drafts
            )

            cursor.execute(query, values)
            connection.commit()

            new_task_id = cursor.lastrowid

            return jsonify({
                'message': 'Task duplicated successfully',
                'id': new_task_id
            }), 201

    except Error as e:
        return jsonify({'error': str(e)}), 500


# noinspection DuplicatedCode
@app.route('/api/drafts', methods=['GET'])
def get_drafts():
    """Get all draft tasks"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query = """
                SELECT * FROM tasks
                WHERE is_draft = TRUE
                ORDER BY updated_at DESC
            """

            cursor.execute(query)
            drafts = cursor.fetchall()

            # Convert datetime objects to strings and tags to array
            for draft in drafts:
                if draft['task_date']:
                    draft['task_date'] = draft['task_date'].isoformat()
                if draft['task_time']:
                    draft['task_time'] = str(draft['task_time'])
                if draft['created_at']:
                    draft['created_at'] = draft['created_at'].isoformat()
                if draft['updated_at']:
                    draft['updated_at'] = draft['updated_at'].isoformat()
                if draft['duration']:
                    draft['duration'] = float(draft['duration'])
                # Convert tags from comma-separated string to array
                tags_value = draft.get('tags')
                if tags_value:
                    draft['tags'] = [t.strip() for t in tags_value.split(',') if t.strip()]
                else:
                    draft['tags'] = []
                # Convert categories from comma-separated string to array
                categories_value = draft.get('categories')
                if categories_value:
                    draft['categories'] = [c.strip() for c in categories_value.split(',') if c.strip()]
                else:
                    draft['categories'] = [draft.get('category', 'other')]

            return jsonify(drafts)

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
                fieldnames = list(tasks[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for task in tasks:
                    # sanitize each value to prevent formula injection
                    safe_row = {k: sanitize_csv_field(task.get(k)) for k in fieldnames}
                    writer.writerow(safe_row)
            
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

@app.route('/api/export/hours-report', methods=['GET'])
def export_hours_report():
    """Export tasks to CSV in hours report format (compatible with Google Sheets billable hours format)"""
    try:
        # Get filtering parameters
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

            query += " ORDER BY task_date ASC, task_time ASC"

            cursor.execute(query, params)
            tasks = cursor.fetchall()

            # Create CSV in hours report format
            output = io.StringIO()

            # Define hours report format columns
            fieldnames = ['Date', 'Client', 'Task', 'Category', 'Hours', 'Status', 'Notes']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            # Transform tasks into hours report format
            for task in tasks:
                # Parse categories from JSON if it's a string
                categories_str = ''
                if task.get('categories'):
                    try:
                        import json
                        categories_list = json.loads(task['categories']) if isinstance(task['categories'], str) else task['categories']
                        categories_str = ', '.join(categories_list) if isinstance(categories_list, list) else str(categories_list)
                    except:
                        categories_str = str(task['categories'])

                writer.writerow({
                    'Date': task['task_date'].strftime('%Y-%m-%d') if hasattr(task['task_date'], 'strftime') else str(task['task_date']),
                    'Client': task.get('client', ''),
                    'Task': task.get('title', ''),
                    'Category': categories_str,
                    'Hours': task.get('duration', ''),
                    'Status': task.get('status', ''),
                    'Notes': task.get('notes', '')
                })

            # Convert to bytes for sending
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'hours_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/import/hours-report', methods=['POST'])
def import_hours_report():
    """Import tasks from hours report CSV or Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Read the file based on extension
            if filename.endswith('.csv'):
                # Try different encodings for Hebrew support
                encodings_to_try = [
                    'utf-8-sig', 'utf-8', 'windows-1255', 'iso-8859-8', 'cp1255',
                    'cp1252', 'windows-1252', 'latin-1', 'iso-8859-1'
                ]

                df = None
                for encoding in encodings_to_try:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        print(f"Successfully read file with encoding: {encoding}")
                        break
                    except (UnicodeDecodeError, UnicodeError, LookupError):
                        continue

                if df is None:
                    df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file.'}), 400

            # Expected columns: Date, Client, Task, Category, Hours, Status, Notes
            required_columns = ['Date', 'Task']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400

            # Process and import tasks
            imported_count = 0
            errors = []

            with get_db_connection() as connection:
                cursor = connection.cursor()

                for index, row in df.iterrows():
                    try:
                        # Parse date
                        task_date = pd.to_datetime(row['Date'], errors='coerce')
                        if pd.isna(task_date):
                            errors.append(f"Row {index + 2}: Invalid date")
                            continue

                        # Get task details
                        title = str(row['Task']).strip() if pd.notna(row['Task']) else ''
                        if not title:
                            errors.append(f"Row {index + 2}: Missing task title")
                            continue

                        client = str(row.get('Client', '')).strip() if pd.notna(row.get('Client')) else ''
                        category = str(row.get('Category', 'other')).strip() if pd.notna(row.get('Category')) else 'other'
                        duration = row.get('Hours')
                        status = str(row.get('Status', 'completed')).strip().lower() if pd.notna(row.get('Status')) else 'completed'
                        notes = str(row.get('Notes', '')).strip() if pd.notna(row.get('Notes')) else ''

                        # Handle duration - convert to float or None
                        if pd.notna(duration) and duration != '':
                            try:
                                duration = float(duration)
                            except (ValueError, TypeError):
                                duration = None
                        else:
                            duration = None

                        # Insert into database
                        query = """
                            INSERT INTO tasks
                            (title, description, category, categories, client, task_date, task_time,
                             duration, status, tags, notes)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """

                        values = (
                            title,
                            '',  # description
                            category,
                            category,  # categories
                            client,
                            task_date.strftime('%Y-%m-%d'),
                            '00:00:00',  # default time
                            duration,
                            status if status in ['completed', 'uncompleted'] else 'completed',
                            '',  # tags
                            notes
                        )

                        cursor.execute(query, values)
                        imported_count += 1

                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                        continue

                connection.commit()

            # Clean up uploaded file
            os.remove(file_path)

            result = {
                'message': f'Successfully imported {imported_count} task(s)',
                'imported_count': imported_count
            }

            if errors:
                result['errors'] = errors[:10]  # Return first 10 errors
                if len(errors) > 10:
                    result['additional_errors'] = len(errors) - 10

            return jsonify(result), 200

        except Exception as e:
            # Clean up file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

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

@app.route('/api/categories', methods=['GET', 'POST'])
def manage_categories():
    """Get list of categories or create a new one"""
    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("""
                    SELECT category_id as id, label, color, icon
                    FROM categories_master
                    ORDER BY label
                """)
                categories = cursor.fetchall()
                return jsonify(categories)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            category_id = data.get('id', '').strip().lower().replace(' ', '-')
            label = data.get('label', '').strip()
            color = data.get('color', '#0d6efd')
            icon = data.get('icon', '📝')

            if not category_id or not label:
                return jsonify({'error': 'Category ID and label are required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    INSERT INTO categories_master (category_id, label, color, icon)
                    VALUES (%s, %s, %s, %s)
                """, (category_id, label, color, icon))
                connection.commit()

                return jsonify({
                    'id': category_id,
                    'label': label,
                    'color': color,
                    'icon': icon
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Category already exists'}), 409
            return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<category_id>', methods=['PUT', 'DELETE'])
def update_delete_category(category_id):
    """Update or delete a category"""
    if request.method == 'PUT':
        try:
            data = request.json
            label = data.get('label', '').strip()
            color = data.get('color')
            icon = data.get('icon')

            if not label:
                return jsonify({'error': 'Label is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    UPDATE categories_master
                    SET label = %s, color = %s, icon = %s
                    WHERE category_id = %s
                """, (label, color, icon, category_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    DELETE FROM categories_master
                    WHERE category_id = %s
                """, (category_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Category not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/tags', methods=['GET', 'POST'])
def manage_tags():
    """Get list of tags or create a new one"""
    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("""
                    SELECT id, name, color
                    FROM tags
                    ORDER BY name
                """)
                tags = cursor.fetchall()
                return jsonify(tags)
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color', '#0d6efd')

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    INSERT INTO tags (name, color)
                    VALUES (%s, %s)
                """, (name, color))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'color': color
                }), 201
        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Tag already exists'}), 409
            return jsonify({'error': str(e)}), 500

@app.route('/api/tags/<int:tag_id>', methods=['PUT', 'DELETE'])
def update_delete_tag(tag_id):
    """Update or delete a tag"""
    if request.method == 'PUT':
        try:
            data = request.json
            name = data.get('name', '').strip()
            color = data.get('color')

            if not name:
                return jsonify({'error': 'Tag name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    UPDATE tags
                    SET name = %s, color = %s
                    WHERE id = %s
                """, (name, color, tag_id))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    DELETE FROM tags
                    WHERE id = %s
                """, (tag_id,))
                connection.commit()

                if cursor.rowcount == 0:
                    return jsonify({'error': 'Tag not found'}), 404

                return jsonify({'success': True})
        except Error as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/clients', methods=['GET', 'POST'])
def manage_clients_list():
    """Get list of clients or create a new one"""
    if request.method == 'GET':
        try:
            with get_db_connection() as connection:
                cursor = connection.cursor(dictionary=True)

                # Get all clients from clients table and tasks table (combined)
                cursor.execute("""
                    SELECT name, email, phone, notes, created_at, updated_at
                    FROM clients
                    ORDER BY name
                """)
                clients_from_table = cursor.fetchall()

                # Also get clients that only exist in tasks table
                cursor.execute("""
                    SELECT DISTINCT client
                    FROM tasks
                    WHERE client IS NOT NULL
                      AND client != ''
                      AND client NOT IN (SELECT name FROM clients)
                    ORDER BY client
                """)
                clients_from_tasks = [row['client'] for row in cursor.fetchall()]

                # Combine both lists
                all_clients = clients_from_table + [{'name': c} for c in clients_from_tasks]

                return jsonify(all_clients)

        except Error as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            name = data.get('name', '').strip()

            if not name:
                return jsonify({'error': 'Client name is required'}), 400

            with get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    INSERT INTO clients (name, email, phone, notes)
                    VALUES (%s, %s, %s, %s)
                """, (
                    name,
                    data.get('email', ''),
                    data.get('phone', ''),
                    data.get('notes', '')
                ))
                connection.commit()

                return jsonify({
                    'id': cursor.lastrowid,
                    'name': name,
                    'email': data.get('email', ''),
                    'phone': data.get('phone', ''),
                    'notes': data.get('notes', '')
                }), 201

        except Error as e:
            if 'Duplicate entry' in str(e):
                return jsonify({'error': 'Client already exists'}), 409
            return jsonify({'error': str(e)}), 500

# ============ BANK TRANSACTIONS ENDPOINTS ============

def clean_transaction_data(df):
    """Clean transaction data from uploaded file"""
    print(f"[CLEAN] Before cleaning: {len(df)} rows", flush=True)

    # Remove rows where all columns are empty
    df = df.dropna(how='all')
    print(f"[CLEAN] After removing empty rows: {len(df)} rows", flush=True)

    # Don't drop rows based on columns yet - let the main parser handle it
    # Just remove completely empty rows

    # Reset index
    df = df.reset_index(drop=True)

    print(f"[CLEAN] First 3 rows after cleaning:", flush=True)
    for i in range(min(3, len(df))):
        print(f"  Row {i}: {df.iloc[i].tolist()}", flush=True)

    return df

def parse_cash_transaction_file(file_path):
    """Parse CSV file for cash transactions (handles header row and different column orders)"""
    try:
        print(f"\n{'='*60}", flush=True)
        print(f"[CASH TRANSACTIONS] Starting to parse file", flush=True)
        
        # Try Hebrew encodings
        encodings_to_try = ['utf-8-sig', 'utf-8', 'windows-1255', 'cp1255', 'iso-8859-8']
        
        df = None
        for encoding in encodings_to_try:
            try:
                # Read with header to check column names
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"[SUCCESS] Read cash CSV with encoding: {encoding}", flush=True)
                print(f"[COLUMNS] Found columns: {list(df.columns)}", flush=True)
                break
            except Exception as e:
                print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                continue

        if df is None:
            df = pd.read_csv(file_path, encoding='utf-8', errors='replace')

        # Remove completely empty rows
        df = df.dropna(how='all')
        
        # Filter out rows that are totals (contain "סה״כ" anywhere)
        for col in df.columns:
            df = df[~df[col].astype(str).str.contains('סה״כ', na=False)]
        
        print(f"[CLEAN] After removing totals: {len(df)} rows", flush=True)
        
        if len(df) == 0:
            raise ValueError("No valid transactions found in file")

        # Try to identify columns by content or header names
        # Common Hebrew headers: שם כרטיס (card), תאריך (date), שם בית עסק (business), סכום קנייה (amount)
        date_col = None
        amount_col = None
        desc_col = None
        account_col = None
        
        # Check column headers for Hebrew names
        for i, col in enumerate(df.columns):
            col_str = str(col).strip()
            if 'תאריך' in col_str or 'date' in col_str.lower():
                date_col = i
            elif 'סכום' in col_str or 'amount' in col_str.lower():
                amount_col = i
            elif 'בית עסק' in col_str or 'description' in col_str.lower() or 'עסק' in col_str:
                desc_col = i
            elif 'כרטיס' in col_str or 'חשבון' in col_str or 'account' in col_str.lower():
                account_col = i
        
        # If headers didn't work, try to detect by content
        if date_col is None:
            date_pattern = r'\d{2}\.\d{2}\.\d{4}'
            for i in range(len(df.columns)):
                sample_values = df.iloc[:5, i].astype(str)
                if sample_values.str.match(date_pattern).any():
                    date_col = i
                    break
        
        if amount_col is None:
            for i in range(len(df.columns)):
                if i == date_col:
                    continue
                sample_values = df.iloc[:5, i].astype(str).str.replace(',', '').str.replace('"', '')
                try:
                    pd.to_numeric(sample_values, errors='raise')
                    amount_col = i
                    break
                except:
                    continue
        
        # Default assignments if still not found
        if date_col is None:
            date_col = 1  # Common position for date
        if amount_col is None:
            amount_col = 3  # Common position for amount
        if desc_col is None:
            desc_col = 2  # Common position for description
        if account_col is None:
            account_col = 0  # Common position for account
        
        print(f"[COLUMNS] Using: date={date_col}, amount={amount_col}, desc={desc_col}, account={account_col}", flush=True)
        
        # Create structured dataframe
        transactions = []
        for idx, row in df.iterrows():
            try:
                # Get date
                date_str = str(row.iloc[date_col]).strip()
                # Skip if not a valid date
                if not pd.notna(row.iloc[date_col]) or date_str in ['', 'nan', 'NaN']:
                    continue
                    
                transaction_date = pd.to_datetime(date_str, format='%d.%m.%Y', errors='coerce')
                if pd.isna(transaction_date):
                    # Try other date formats
                    transaction_date = pd.to_datetime(date_str, errors='coerce')
                if pd.isna(transaction_date):
                    print(f"[SKIP] Row {idx}: Invalid date '{date_str}'", flush=True)
                    continue
                
                # Get amount (remove commas and quotes)
                amount_str = str(row.iloc[amount_col]).strip().replace(',', '').replace('"', '')
                if not amount_str or amount_str in ['nan', 'NaN', '']:
                    continue
                amount = float(amount_str)
                
                # Get description
                description = str(row.iloc[desc_col]).strip() if pd.notna(row.iloc[desc_col]) else 'משיכת מזומן'
                if description in ['nan', 'NaN', '']:
                    description = 'משיכת מזומן'
                
                # Get account number
                account_number = str(row.iloc[account_col]).strip() if pd.notna(row.iloc[account_col]) else ''
                if account_number in ['nan', 'NaN']:
                    account_number = ''
                
                # Month year
                month_year = transaction_date.strftime('%Y-%m')
                
                transactions.append({
                    'transaction_date': transaction_date,
                    'amount': amount,
                    'account_number': account_number,
                    'description': description,
                    'month_year': month_year,
                    'transaction_type': 'cash'
                })
                print(f"[PARSED] {transaction_date.strftime('%Y-%m-%d')}: {description} = {amount}", flush=True)
            except Exception as e:
                print(f"[SKIP ROW {idx}] Error: {e}", flush=True)
                continue

        if not transactions:
            raise ValueError("No valid transactions could be parsed from the file")

        result_df = pd.DataFrame(transactions)
        print(f"[CASH TRANSACTIONS] Successfully parsed {len(result_df)} transactions", flush=True)
        
        return result_df

    except Exception as e:
        print(f"[ERROR] Cash transaction parsing failed: {str(e)}", flush=True)
        raise ValueError(f"Error parsing cash transaction file: {str(e)}")

def parse_transaction_file(file_path, transaction_type='credit'):
    """Parse CSV or Excel file and return cleaned dataframe"""
    try:
        # If it's marked as cash transaction, use special parser
        if transaction_type == 'cash':
            return parse_cash_transaction_file(file_path)

        # Otherwise use standard credit card transaction parser
        # Determine file type and read accordingly
        if file_path.endswith('.csv'):
            # Use chardet to detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                result = chardet.detect(raw_data)
                detected_encoding = result['encoding']
                confidence = result['confidence']

                print(f"\n{'='*60}", flush=True)
                print(f"[ENCODING DEBUG] File: {file_path}", flush=True)
                print(f"[CHARDET] Detected: {detected_encoding} (confidence: {confidence})", flush=True)

                # Show first 200 bytes in hex for debugging
                print(f"[RAW BYTES] First 200 bytes (hex): {raw_data[:200].hex()}", flush=True)

                # Try to decode first line with different encodings to see which looks right
                first_line_end = raw_data.find(b'\n')
                if first_line_end > 0:
                    first_line_bytes = raw_data[:first_line_end]
                    print(f"[FIRST LINE BYTES] {first_line_bytes.hex()}", flush=True)
                    for test_enc in ['windows-1255', 'utf-8', 'iso-8859-8', 'cp1255']:
                        try:
                            decoded = first_line_bytes.decode(test_enc)
                            print(f"[TEST DECODE {test_enc}] {decoded}", flush=True)
                        except:
                            print(f"[TEST DECODE {test_enc}] FAILED", flush=True)

                # Map common encodings to their variants
                encoding_map = {
                    'ISO-8859-8': 'windows-1255',  # Hebrew ISO -> Windows Hebrew
                    'ISO-8859-1': 'cp1252',         # Latin-1 -> Windows-1252
                    'ascii': 'utf-8'                # ASCII -> UTF-8
                }

                # Try detected encoding first, then its mapped variant
                encodings_to_try = []
                if detected_encoding:
                    encodings_to_try.append(detected_encoding)
                    if detected_encoding.upper() in encoding_map:
                        encodings_to_try.append(encoding_map[detected_encoding.upper()])

                # Add Hebrew encodings as backup (since detection can be unreliable for Hebrew)
                encodings_to_try.extend([
                    'windows-1255',
                    'cp1255',
                    'iso-8859-8',
                    'utf-8-sig',
                    'utf-8',
                    'cp1252',
                    'windows-1252',
                    'latin-1'
                ])

                # Remove duplicates while preserving order
                seen = set()
                encodings_to_try = [x for x in encodings_to_try if x and not (x in seen or seen.add(x))]

            df = None
            used_encoding = None
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    used_encoding = encoding
                    print(f"[SUCCESS] Read CSV with encoding: {encoding}", flush=True)

                    # Debug: show first description value
                    if len(df) > 0 and len(df.columns) >= 3:
                        first_desc = df.iloc[0, 2] if len(df.columns) > 2 else "N/A"
                        print(f"[FIRST DESCRIPTION] {first_desc}", flush=True)
                        print(f"[FIRST DESC BYTES] {str(first_desc).encode('utf-8').hex()}", flush=True)

                    break
                except (UnicodeDecodeError, UnicodeError, LookupError) as e:
                    print(f"[FAILED] {encoding}: {str(e)[:50]}", flush=True)
                    continue

            if df is None:
                # If all encodings fail, try with errors='replace'
                df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
                used_encoding = 'utf-8-replace'
                print(f"[FALLBACK] Using UTF-8 with error replacement", flush=True)
        else:
            df = pd.read_excel(file_path)

        # Clean the data
        df = clean_transaction_data(df)

        # Ensure we have the expected columns
        if len(df.columns) < 4:
            raise ValueError("File must have at least 4 columns: Account Number, Date, Description, Amount")

        # Rename columns to standard names
        df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])

        # Parse dates - handle DD.MM.YYYY format
        print(f"[PARSE] Before date parsing: {len(df)} rows", flush=True)
        df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%d.%m.%Y', errors='coerce')
        print(f"[PARSE] After date parsing, rows with NaT dates: {df['transaction_date'].isna().sum()}", flush=True)

        # Convert amount to float
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        print(f"[PARSE] After amount parsing, rows with NaN amounts: {df['amount'].isna().sum()}", flush=True)

        # Show first 3 rows before dropping
        print(f"[PARSE] First 3 rows before dropping NaN:", flush=True)
        for i in range(min(3, len(df))):
            print(f"  Row {i}: date={df.iloc[i]['transaction_date']}, desc={df.iloc[i]['description']}, amt={df.iloc[i]['amount']}", flush=True)

        # Remove rows with invalid dates or amounts
        df = df.dropna(subset=['transaction_date', 'amount'])
        print(f"[PARSE] After dropping NaN: {len(df)} rows remaining", flush=True)

        # Add month_year column
        df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')
        
        # Add transaction_type column
        df['transaction_type'] = transaction_type

        return df

    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")

@app.route('/api/transactions/upload', methods=['POST'])
def upload_transactions():
    """Upload and parse bank transaction file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        transaction_type = request.form.get('transaction_type', 'credit')  # Get transaction type from form

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Parse the file with transaction type
            df = parse_transaction_file(file_path, transaction_type)

            # Calculate total amount
            total_amount = float(df['amount'].sum())

            # Convert to list of dictionaries for JSON response
            transactions = []
            for idx, row in df.iterrows():
                desc_value = str(row['description'])

                # Debug first transaction
                if idx == 0:
                    print(f"[FIRST TRANSACTION DEBUG]", flush=True)
                    print(f"  Description value: {desc_value}", flush=True)
                    print(f"  Description type: {type(desc_value)}", flush=True)
                    print(f"  Description bytes: {desc_value.encode('utf-8').hex()}", flush=True)
                    print(f"  Description repr: {repr(desc_value)}", flush=True)

                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': desc_value,
                    'amount': float(row['amount']),
                    'month_year': row['month_year'],
                    'transaction_type': row.get('transaction_type', transaction_type)
                })

            response_data = {
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'temp_filename': filename,  # Return filename for re-encoding attempts
                'transaction_type': transaction_type
            }

            # Debug the JSON response
            if transactions:
                print(f"[JSON RESPONSE DEBUG]", flush=True)
                print(f"  First transaction description: {transactions[0]['description']}", flush=True)
                import json
                json_str = json.dumps(transactions[0], ensure_ascii=False)
                print(f"  First transaction JSON: {json_str}", flush=True)
                print(f"  JSON bytes: {json_str.encode('utf-8').hex()}", flush=True)
                print(f"{'='*60}\n", flush=True)

            return jsonify(response_data)

        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/transactions/encoding-preview', methods=['POST'])
def encoding_preview():
    """Show previews of file with different encodings to let user choose"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f'preview_{filename}')
        file.save(file_path)

        # List of encodings to try
        encodings_to_test = [
            'utf-8',
            'windows-1255',  # Hebrew Windows
            'iso-8859-8',    # Hebrew ISO
            'cp1255',        # Hebrew Code Page
            'utf-16',
            'windows-1252',  # Western European
            'iso-8859-1',    # Latin-1
        ]

        previews = []

        for encoding in encodings_to_test:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                df = clean_transaction_data(df)

                if len(df.columns) >= 4:
                    # Get first 3 rows, 3rd column (description)
                    descriptions = []
                    for i in range(min(3, len(df))):
                        try:
                            desc = str(df.iloc[i, 2])  # 3rd column
                            descriptions.append(desc)
                        except:
                            descriptions.append("N/A")

                    previews.append({
                        'encoding': encoding,
                        'success': True,
                        'samples': descriptions
                    })
            except Exception as e:
                previews.append({
                    'encoding': encoding,
                    'success': False,
                    'error': str(e)[:100]
                })

        # Keep the file for when user selects an encoding
        return jsonify({
            'success': True,
            'temp_filename': filename,
            'previews': previews
        })

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/transactions/upload-with-encoding', methods=['POST'])
def upload_with_encoding():
    """Upload file with user-selected encoding"""
    try:
        data = request.json
        temp_filename = data.get('temp_filename')
        selected_encoding = data.get('encoding', 'utf-8')

        if not temp_filename:
            return jsonify({'error': 'No temp filename provided'}), 400

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f'preview_{temp_filename}')

        if not os.path.exists(file_path):
            return jsonify({'error': 'Temporary file not found'}), 400

        try:
            # Parse with selected encoding
            df = pd.read_csv(file_path, encoding=selected_encoding)
            df = clean_transaction_data(df)

            if len(df.columns) < 4:
                raise ValueError("File must have at least 4 columns")

            df.columns = ['account_number', 'transaction_date', 'description', 'amount'] + list(df.columns[4:])
            df['transaction_date'] = pd.to_datetime(df['transaction_date'], format='%d.%m.%Y', errors='coerce')
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
            df = df.dropna(subset=['transaction_date', 'amount'])
            df['month_year'] = df['transaction_date'].dt.strftime('%Y-%m')

            # Convert to transactions list
            transactions = []
            for _, row in df.iterrows():
                transactions.append({
                    'account_number': str(row['account_number']) if pd.notna(row['account_number']) else '',
                    'transaction_date': row['transaction_date'].strftime('%Y-%m-%d'),
                    'description': str(row['description']),
                    'amount': float(row['amount']),
                    'month_year': row['month_year']
                })

            total_amount = float(df['amount'].sum())

            return jsonify({
                'success': True,
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'transactions': transactions,
                'month_year': transactions[0]['month_year'] if transactions else None,
                'encoding_used': selected_encoding
            })

        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/transactions/save', methods=['POST'])
def save_transactions():
    """Save parsed transactions to database"""
    try:
        data = request.json
        transactions = data.get('transactions', [])

        if not transactions:
            return jsonify({'error': 'No transactions to save'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            # Insert transactions
            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type)
                VALUES (%s, %s, %s, %s, %s, %s)
            """

            for trans in transactions:
                values = (
                    trans.get('account_number', ''),
                    trans['transaction_date'],
                    trans['description'],
                    trans['amount'],
                    trans['month_year'],
                    trans.get('transaction_type', 'credit')
                )
                cursor.execute(query, values)

            connection.commit()

            return jsonify({
                'success': True,
                'message': f'{len(transactions)} transactions saved successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/months', methods=['GET'])
def get_transaction_months():
    """Get list of months with saved transactions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT
                    month_year,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    MIN(transaction_date) as start_date,
                    MAX(transaction_date) as end_date,
                    MAX(upload_date) as last_upload
                FROM bank_transactions
                GROUP BY month_year
                ORDER BY month_year DESC
            """)

            months = cursor.fetchall()

            # Convert Decimal to float
            for month in months:
                if month['total_amount']:
                    month['total_amount'] = float(month['total_amount'])
                if month['start_date']:
                    month['start_date'] = month['start_date'].isoformat()
                if month['end_date']:
                    month['end_date'] = month['end_date'].isoformat()
                if month['last_upload']:
                    month['last_upload'] = month['last_upload'].isoformat()

            return jsonify(months)

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/all', methods=['GET'])
def get_all_transactions():
    """Get all transactions (not filtered by month)"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT
                    id,
                    account_number,
                    transaction_date,
                    description,
                    amount,
                    month_year,
                    transaction_type,
                    upload_date
                FROM bank_transactions
                ORDER BY transaction_date DESC, id DESC
            """)

            transactions = cursor.fetchall()

            # Convert types
            for trans in transactions:
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    trans['amount'] = float(trans['amount'])
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<month_year>', methods=['GET'])
def get_transactions_by_month(month_year):
    """Get all transactions for a specific month"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT
                    id,
                    account_number,
                    transaction_date,
                    description,
                    amount,
                    month_year,
                    transaction_type,
                    upload_date
                FROM bank_transactions
                WHERE month_year = %s
                ORDER BY transaction_date DESC, id DESC
            """, (month_year,))

            transactions = cursor.fetchall()

            # Convert types
            for trans in transactions:
                if trans['transaction_date']:
                    trans['transaction_date'] = trans['transaction_date'].isoformat()
                if trans['amount']:
                    trans['amount'] = float(trans['amount'])
                if trans['upload_date']:
                    trans['upload_date'] = trans['upload_date'].isoformat()
                if not trans.get('transaction_type'):
                    trans['transaction_type'] = 'credit'

            return jsonify(transactions)

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a specific transaction"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM bank_transactions WHERE id = %s", (transaction_id,))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Transaction not found'}), 404

            return jsonify({'message': 'Transaction deleted successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/month/<month_year>', methods=['DELETE'])
def delete_month_transactions(month_year):
    """Delete all transactions for a specific month"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM bank_transactions WHERE month_year = %s", (month_year,))
            connection.commit()

            return jsonify({
                'message': f'{cursor.rowcount} transactions deleted successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update a specific transaction"""
    try:
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                UPDATE bank_transactions
                SET transaction_date = %s, description = %s, amount = %s,
                    month_year = %s, account_number = %s, transaction_type = %s
                WHERE id = %s
            """

            cursor.execute(query, (
                data['transaction_date'],
                data['description'],
                data['amount'],
                data['month_year'],
                data.get('account_number', ''),
                data.get('transaction_type', 'credit'),
                transaction_id
            ))
            connection.commit()

            return jsonify({'message': 'Transaction updated successfully'})

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/manual', methods=['POST'])
def add_manual_transaction():
    """Add a transaction manually"""
    try:
        data = request.json

        with get_db_connection() as connection:
            cursor = connection.cursor()

            query = """
                INSERT INTO bank_transactions
                (account_number, transaction_date, description, amount, month_year, transaction_type)
                VALUES (%s, %s, %s, %s, %s, %s)
            """

            cursor.execute(query, (
                data.get('account_number', ''),
                data['transaction_date'],
                data['description'],
                data['amount'],
                data['month_year'],
                data.get('transaction_type', 'credit')
            ))
            connection.commit()

            return jsonify({
                'message': 'Transaction added successfully',
                'id': cursor.lastrowid
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/descriptions', methods=['GET'])
def get_all_descriptions():
    """Get all unique transaction descriptions"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("""
                SELECT DISTINCT description
                FROM bank_transactions
                WHERE description IS NOT NULL AND description != ''
                ORDER BY description
            """)

            descriptions = [row[0] for row in cursor.fetchall()]
            return jsonify(descriptions)

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/stats', methods=['GET'])
def get_transaction_stats():
    """Get transaction statistics including cash vs credit breakdown"""
    try:
        # Get optional date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Base query with optional date filtering
            date_filter = ""
            params = []
            if start_date:
                date_filter += " AND transaction_date >= %s"
                params.append(start_date)
            if end_date:
                date_filter += " AND transaction_date <= %s"
                params.append(end_date)

            # Overall stats by type
            cursor.execute(f"""
                SELECT 
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    MIN(transaction_date) as first_date,
                    MAX(transaction_date) as last_date
                FROM bank_transactions
                WHERE 1=1 {date_filter}
                GROUP BY transaction_type
            """, params)
            
            by_type = cursor.fetchall()
            
            # Convert Decimal to float
            for item in by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])
                if item['avg_amount']:
                    item['avg_amount'] = float(item['avg_amount'])
                if item['first_date']:
                    item['first_date'] = item['first_date'].isoformat()
                if item['last_date']:
                    item['last_date'] = item['last_date'].isoformat()

            # Monthly breakdown by type
            cursor.execute(f"""
                SELECT 
                    month_year,
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount
                FROM bank_transactions
                WHERE 1=1 {date_filter}
                GROUP BY month_year, transaction_type
                ORDER BY month_year DESC, transaction_type
            """, params)
            
            monthly_by_type = cursor.fetchall()
            
            # Convert Decimal to float
            for item in monthly_by_type:
                if item['total_amount']:
                    item['total_amount'] = float(item['total_amount'])

            return jsonify({
                'by_type': by_type,
                'monthly_by_type': monthly_by_type
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

# ============ CLIENT MANAGEMENT ENDPOINTS ============

@app.route('/api/clients/manage', methods=['GET'])
def get_all_clients_with_stats():
    """Get all clients with their billable hours statistics"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT
                    client,
                    COUNT(*) as task_count,
                    SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as total_hours,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
                FROM tasks
                WHERE client IS NOT NULL AND client != ''
                GROUP BY client
                ORDER BY client
       
       
             """)

            clients = cursor.fetchall()
            
            # Convert Decimal to float for JSON serialization
            for client in clients:
                if client.get('total_hours') is not None:
                    client['total_hours'] = float(client['total_hours'])
                else:
                    client['total_hours'] = 0.0
            
            return jsonify(clients)

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clients/<client_name>', methods=['PUT'])
def rename_client(client_name):
    """Rename a client across all tasks"""
    try:
        data = request.json
        new_name = data.get('new_name')

        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("UPDATE tasks SET client = %s WHERE client = %s", (new_name, client_name))
            connection.commit()

            return jsonify({
                'message': f'Client renamed successfully',
                'updated_count': cursor.rowcount
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clients/<client_name>', methods=['DELETE'])
def delete_client(client_name):
    """Delete all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            cursor.execute("DELETE FROM tasks WHERE client = %s", (client_name,))
            connection.commit()

            return jsonify({
                'message': f'{cursor.rowcount} tasks deleted successfully'
            })

    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clients/<client_name>/tasks', methods=['GET'])
def get_client_tasks(client_name):
    """Get all tasks for a specific client"""
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT * FROM tasks
                WHERE client = %s
                ORDER BY task_date DESC, task_time DESC
            """, (client_name,))

            tasks = cursor.fetchall()

            # Convert datetime objects to strings
            for task in tasks:
                if task.get('task_date'):
                    task['task_date'] = task['task_date'].strftime('%Y-%m-%d')
                if task.get('task_time'):
                    task['task_time'] = str(task['task_time'])

            return jsonify(tasks)

    except Error as e:
        return jsonify({'error': str(e)}), 500


# Initialize database on import (works with gunicorn)
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

