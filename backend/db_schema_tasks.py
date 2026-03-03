"""Schema initialization for task-related tables."""
from mysql.connector import Error


def init_tasks_tables(cursor, connection):
    """Create and migrate tasks and task_attachments tables."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            client VARCHAR(255),
            task_date DATE NOT NULL,
            task_time TIME,
            duration DECIMAL(5, 2),
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

    for col, col_def, label in [
        ("shared", "BOOLEAN DEFAULT FALSE", "shared"),
        ("created_by", "VARCHAR(255)", "created_by"),
        ("is_draft", "BOOLEAN DEFAULT FALSE", "is_draft"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col} {col_def}")
            print(f"Added {label} column to tasks")
        except Error as e:
            if 'Duplicate column' not in str(e):
                print(f"Note: {e}")

    for idx_name, idx_col in [
        ("idx_shared", "shared"),
        ("idx_created_by", "created_by"),
        ("idx_draft", "is_draft"),
    ]:
        try:
            cursor.execute(f"CREATE INDEX {idx_name} ON tasks({idx_col})")
            print(f"Added index {idx_name}")
        except Error as e:
            if 'Duplicate' not in str(e):
                print(f"Note: {e}")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task_id INT NOT NULL,
            filename VARCHAR(255) NOT NULL,
            stored_filename VARCHAR(255),
            content_type VARCHAR(100),
            file_size INT,
            cloudinary_url VARCHAR(1024) DEFAULT NULL,
            cloudinary_public_id VARCHAR(512) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_task_id (task_id),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
    """)
    print("Created task_attachments table")

    try:
        cursor.execute("""
            ALTER TABLE task_attachments
            ADD COLUMN cloudinary_url VARCHAR(1024) DEFAULT NULL,
            ADD COLUMN cloudinary_public_id VARCHAR(512) DEFAULT NULL
        """)
        print("Added cloudinary columns to task_attachments")
    except Exception as e:
        print(f"Note: {e}")
