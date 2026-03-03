# taxonomy.py - re-exports for backwards compatibility
from routes.taxonomy_categories import taxonomy_categories_bp
from routes.taxonomy_tags import taxonomy_tags_bp
from routes.taxonomy_clients import taxonomy_clients_bp

# Keep the original blueprint name for any existing registrations
taxonomy_bp = taxonomy_categories_bp  # main blueprint kept for backward compat
