"""
Task Manager App - Main entry point.
Registers all route blueprints and initializes the database.
"""
from config import app, init_db

# Import route blueprints
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.portfolio import portfolio_bp
from routes.transactions import transactions_bp
from routes.admin import admin_bp

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(portfolio_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(admin_bp)

# Initialize database on import (works with gunicorn)
try:
    init_db()
    print("\u2713 Database initialized successfully")
except Exception as e:
    print(f"\u26a0 Warning: Database initialization failed: {e}")
    print("\u26a0 App will start but database operations will fail until MySQL is configured")


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
