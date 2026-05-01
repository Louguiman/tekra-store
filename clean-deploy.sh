#!/bin/bash

# West Africa E-commerce Platform - Clean Deployment Script
# This script removes existing volumes to fix version incompatibilities (like Postgres 15 vs 16)

set -e

echo "🧹 Starting clean deployment (wiping volumes)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine docker compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}Error: Neither docker-compose nor docker compose is available${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will delete all data in your database volumes!${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo "Stopping and removing containers with volumes..."
$COMPOSE_CMD down -v

echo "Building and starting services fresh..."
$COMPOSE_CMD up -d --build

echo -e "${GREEN}✓ Fresh deployment started successfully!${NC}"
echo "You can check the logs with: $COMPOSE_CMD logs -f"
