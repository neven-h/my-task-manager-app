"""
Task Manager App - Main entry point.
Registers all route blueprints and initializes the database.
"""
import logging
import os
from config import app, init_db

_logger = logging.getLogger(__name__)

# Import route blueprints
from routes.auth import auth_bp
from routes.auth_account import auth_account_bp
from routes.auth_delete import auth_delete_bp
from routes.auth_password import auth_password_bp
from routes.auth_forgot_password import auth_forgot_password_bp
from routes.auth_password_reset import auth_password_reset_bp
from routes.auth_2fa import auth_2fa_bp
from routes.auth_2fa_manage import auth_2fa_manage_bp
from routes.tasks import tasks_bp
from routes.tasks_write import tasks_write_bp
from routes.tasks_actions import tasks_actions_bp
from routes.tasks_share import tasks_share_bp
from routes.tasks_analytics import tasks_analytics_bp
from routes.attachments import attachments_bp
from routes.task_export import task_export_bp
from routes.task_import import task_import_bp
from routes.taxonomy_categories import taxonomy_categories_bp
from routes.taxonomy_tags import taxonomy_tags_bp
from routes.taxonomy_clients import taxonomy_clients_bp
from routes.portfolio import portfolio_bp
from routes.portfolio_write import portfolio_write_bp
from routes.portfolio_delete import portfolio_delete_bp
from routes.portfolio_summary import portfolio_summary_bp
from routes.portfolio_market import portfolio_market_bp
from routes.portfolio_search import portfolio_search_bp
from routes.portfolio_watchlist import portfolio_watchlist_bp
from routes.portfolio_yahoo import portfolio_yahoo_bp
from routes.portfolio_yahoo_import import portfolio_yahoo_import_bp
from routes.portfolio_tabs import portfolio_tabs_bp
from routes.transactions import transactions_bp
from routes.transactions_encoding import transactions_encoding_bp
from routes.transaction_tabs import transaction_tabs_bp
from routes.transaction_tabs_adopt import transaction_tabs_adopt_bp
from routes.transaction_query import transaction_query_bp
from routes.transaction_query_month import transaction_query_month_bp
from routes.transaction_stats import transaction_stats_bp
from routes.transaction_mutations import transaction_mutations_bp
from routes.transaction_update import transaction_update_bp
from routes.budget import budget_bp
from routes.budget_tabs import budget_tabs_bp
from routes.budget_export import budget_export_bp
from routes.budget_predict import budget_predict_bp
from routes.budget_links import budget_links_bp
from routes.balance_forecast import balance_forecast_bp
from routes.transaction_export import transaction_export_bp
from routes.transaction_predict import transaction_predict_bp
from routes.transaction_balance_forecast import transaction_balance_forecast_bp
from routes.transaction_insights import transaction_insights_bp
from routes.transaction_batch import transaction_batch_bp
from routes.admin import admin_bp
from routes.admin_diagnose import admin_diagnose_bp
from routes.admin_migrations import admin_migrations_bp

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(auth_account_bp)
app.register_blueprint(auth_delete_bp)
app.register_blueprint(auth_password_bp)
app.register_blueprint(auth_forgot_password_bp)
app.register_blueprint(auth_password_reset_bp)
app.register_blueprint(auth_2fa_bp)
app.register_blueprint(auth_2fa_manage_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(tasks_write_bp)
app.register_blueprint(tasks_actions_bp)
app.register_blueprint(tasks_share_bp)
app.register_blueprint(tasks_analytics_bp)
app.register_blueprint(attachments_bp)
app.register_blueprint(task_export_bp)
app.register_blueprint(task_import_bp)
app.register_blueprint(taxonomy_categories_bp)
app.register_blueprint(taxonomy_tags_bp)
app.register_blueprint(taxonomy_clients_bp)
app.register_blueprint(portfolio_bp)
app.register_blueprint(portfolio_write_bp)
app.register_blueprint(portfolio_delete_bp)
app.register_blueprint(portfolio_summary_bp)
app.register_blueprint(portfolio_market_bp)
app.register_blueprint(portfolio_search_bp)
app.register_blueprint(portfolio_watchlist_bp)
app.register_blueprint(portfolio_yahoo_bp)
app.register_blueprint(portfolio_yahoo_import_bp)
app.register_blueprint(portfolio_tabs_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(transactions_encoding_bp)
app.register_blueprint(transaction_tabs_bp)
app.register_blueprint(transaction_tabs_adopt_bp)
app.register_blueprint(transaction_query_bp)
app.register_blueprint(transaction_query_month_bp)
app.register_blueprint(transaction_stats_bp)
app.register_blueprint(transaction_mutations_bp)
app.register_blueprint(transaction_update_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(budget_tabs_bp)
app.register_blueprint(budget_export_bp)
app.register_blueprint(budget_predict_bp)
app.register_blueprint(budget_links_bp)
app.register_blueprint(balance_forecast_bp)
app.register_blueprint(transaction_export_bp)
app.register_blueprint(transaction_predict_bp)
app.register_blueprint(transaction_balance_forecast_bp)
app.register_blueprint(transaction_insights_bp)
app.register_blueprint(transaction_batch_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(admin_diagnose_bp)
app.register_blueprint(admin_migrations_bp)

# Initialize database on import (works with gunicorn)
try:
    init_db()
    _logger.info("Database initialized successfully")
except Exception:
    _logger.error(
        "Database initialization failed — app will start but DB operations may fail",
        exc_info=True,
    )


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=5001)
