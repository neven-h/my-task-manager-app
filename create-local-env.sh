#!/bin/bash

# Script to create .env file for local development

echo "Creating .env file for local development..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "WARNING: .env already exists!"
    read -p "Overwrite it? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Copy example
cp .env.example .env

# Generate secure keys
echo "Generating secure keys..."
SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ENCRYPT=$(python3 -c "import base64; import os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")

# Update the file for local development
sed -i.bak "s|SECRET_KEY=.*|SECRET_KEY=$SECRET|" .env
sed -i.bak "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT|" .env
sed -i.bak "s|DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$ENCRYPT|" .env
sed -i.bak "s|MIGRATION_PASSWORD=.*|MIGRATION_PASSWORD=local-dev-migration-password|" .env
sed -i.bak "s|USER_PITZ_PASSWORD=.*|USER_PITZ_PASSWORD=dev123|" .env
sed -i.bak "s|DB_HOST=.*|DB_HOST=localhost|" .env
sed -i.bak "s|DB_PASSWORD=.*|DB_PASSWORD=local123|" .env
sed -i.bak "s|FRONTEND_URL=.*|FRONTEND_URL=http://localhost:3000|" .env
sed -i.bak "s|FLASK_ENV=.*|FLASK_ENV=development|" .env
sed -i.bak "s|DEBUG=.*|DEBUG=true|" .env

# Clean up backup file
rm -f .env.bak

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "Configuration:"
echo "  - Local MySQL on localhost:3306"
echo "  - Database: task_tracker"
echo "  - User: root / Password: local123"
echo "  - Flask running in development mode"
echo "  - Login password: dev123"
echo ""
echo "Next steps:"
echo "  1. ./setup-local-db.sh"
echo "  2. cd backend && pip install -r requirements.txt && cd .."
echo "  3. cd frontend && npm install && cd .."
echo "  4. ./run-backend.sh (in one terminal)"
echo "  5. ./run-frontend.sh (in another terminal)"
echo ""
