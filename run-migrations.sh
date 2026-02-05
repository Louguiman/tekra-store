#!/bin/bash

# Script to run database migrations in Docker environment

echo "Running database migrations..."

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: Neither docker-compose nor docker compose is available"
    exit 1
fi

# Run migrations in the backend container
echo "Executing migrations in backend container..."
$COMPOSE_CMD exec backend npm run migration:run

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migration failed"
    exit 1
fi
