#!/bin/bash

# Script to diagnose and fix database migration issues

set -e

echo "=========================================="
echo "Database Migration Diagnostic & Fix Tool"
echo "=========================================="
echo ""

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

# Step 1: Check if containers are running
echo "Step 1: Checking container status..."
if $COMPOSE_CMD ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}✓ Backend container is running${NC}"
else
    echo -e "${RED}✗ Backend container is not running${NC}"
    echo "Starting containers..."
    $COMPOSE_CMD up -d
    sleep 5
fi

if $COMPOSE_CMD ps | grep -q "db.*Up"; then
    echo -e "${GREEN}✓ Database container is running${NC}"
else
    echo -e "${RED}✗ Database container is not running${NC}"
    exit 1
fi

echo ""

# Step 2: Check database connectivity
echo "Step 2: Testing database connectivity..."
if $COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ Database is accessible${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo "Checking database logs..."
    $COMPOSE_CMD logs --tail=20 db
    exit 1
fi

echo ""

# Step 3: Check if migrations table exists
echo "Step 3: Checking migrations table..."
if $COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM migrations;" &> /dev/null; then
    echo -e "${GREEN}✓ Migrations table exists${NC}"
    MIGRATION_COUNT=$($COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM migrations;" | tr -d ' ')
    echo "  Found $MIGRATION_COUNT migration(s) already run"
else
    echo -e "${YELLOW}⚠ Migrations table does not exist (first run)${NC}"
fi

echo ""

# Step 4: Check if supplier_submissions table exists
echo "Step 4: Checking supplier_submissions table..."
if $COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;" &> /dev/null; then
    echo -e "${GREEN}✓ supplier_submissions table exists${NC}"
    SUBMISSION_COUNT=$($COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM supplier_submissions;" | tr -d ' ')
    echo "  Found $SUBMISSION_COUNT submission(s)"
else
    echo -e "${RED}✗ supplier_submissions table does not exist${NC}"
    echo "  This table should be created by migration 1704312008000-AddSupplierAutomation"
fi

echo ""

# Step 5: Check if audit_logs table exists
echo "Step 5: Checking audit_logs table..."
if $COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM audit_logs;" &> /dev/null; then
    echo -e "${GREEN}✓ audit_logs table exists${NC}"
else
    echo -e "${RED}✗ audit_logs table does not exist${NC}"
    echo "  This table should be created by migration 1704312007000-AddAuditAndSecurity"
fi

echo ""

# Step 6: Run migrations
echo "Step 6: Running database migrations..."
echo "This may take a few moments..."
echo ""

if $COMPOSE_CMD exec -T backend npm run migration:run; then
    echo ""
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo ""
    echo -e "${RED}✗ Migration failed${NC}"
    echo ""
    echo "Checking backend logs for errors..."
    $COMPOSE_CMD logs --tail=50 backend
    exit 1
fi

echo ""

# Step 7: Verify tables were created
echo "Step 7: Verifying tables..."
TABLES_TO_CHECK=("supplier_submissions" "suppliers" "processing_logs" "audit_logs" "security_alerts")

ALL_EXIST=true
for table in "${TABLES_TO_CHECK[@]}"; do
    if $COMPOSE_CMD exec -T db psql -U postgres -d ecommerce -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ $table exists${NC}"
    else
        echo -e "${RED}✗ $table does not exist${NC}"
        ALL_EXIST=false
    fi
done

echo ""

# Step 8: Restart backend to clear any cached errors
echo "Step 8: Restarting backend container..."
$COMPOSE_CMD restart backend
echo -e "${GREEN}✓ Backend restarted${NC}"

echo ""
echo "=========================================="

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}SUCCESS: All tables exist and migrations are complete!${NC}"
    echo ""
    echo "You can now access the WhatsApp admin dashboard at:"
    echo "http://localhost:3000/admin/whatsapp"
    echo ""
    echo "The following features are now available:"
    echo "  • WhatsApp supplier submissions"
    echo "  • AI-powered product extraction"
    echo "  • Validation workflow"
    echo "  • Inventory integration"
    echo "  • Audit logging"
    echo "  • Security monitoring"
else
    echo -e "${YELLOW}WARNING: Some tables are still missing${NC}"
    echo "Please check the migration files and database logs"
    echo ""
    echo "To view migration status:"
    echo "  $COMPOSE_CMD exec backend npm run migration:show"
    echo ""
    echo "To view database logs:"
    echo "  $COMPOSE_CMD logs db"
fi

echo "=========================================="
