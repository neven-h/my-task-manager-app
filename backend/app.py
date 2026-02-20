"""
Task Manager App - Main entry point.
Registers all route blueprints and initializes the database.
"""
import os
from config import app, init_db

# Import route blueprints
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.attachments import attachments_bp
from routes.task_export import task_export_bp
from routes.taxonomy import taxonomy_bp
from routes.portfolio import portfolio_bp
from routes.portfolio_market import portfolio_market_bp
from routes.portfolio_yahoo import portfolio_yahoo_bp
from routes.portfolio_tabs import portfolio_tabs_bp
from routes.transactions import transactions_bp
from routes.transaction_tabs import transaction_tabs_bp
from routes.transaction_query import transaction_query_bp
from routes.admin import admin_bp

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(attachments_bp)
app.register_blueprint(task_export_bp)
app.register_blueprint(taxonomy_bp)
app.register_blueprint(portfolio_bp)
app.register_blueprint(portfolio_market_bp)
app.register_blueprint(portfolio_yahoo_bp)
app.register_blueprint(portfolio_tabs_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(transaction_tabs_bp)
app.register_blueprint(transaction_query_bp)
app.register_blueprint(admin_bp)

# Initialize database on import (works with gunicorn)
try:
    init_db()
    print("\u2713 Database initialized successfully")
except Exception as e:
    print(f"\u26a0 Warning: Database initialization failed: {e}")
    print("\u26a0 App will start but database operations will fail until MySQL is configured")


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=5001)
