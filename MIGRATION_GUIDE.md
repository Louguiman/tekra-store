# Database Migration Guide

## Overview
This guide explains how to run database migrations for the e-commerce platform, particularly for the WhatsApp Supplier Automation feature.

## Error: "relation does not exist"

If you see errors like:
```
relation "supplier_submissions" does not exist
relation "audit_logs" does not exist
```

This means the database migrations haven't been run yet. Follow the steps below to fix this.

## Prerequisites

- Docker and Docker Compose installed and running
- Application containers are running
- Database container is healthy

## Running Migrations

### Option 1: Using the Migration Scripts (Recommended)

#### On Linux/Mac:
```bash
chmod +x run-migrations.sh
./run-migrations.sh
```

#### On Windows (PowerShell):
```powershell
.\run-migrations.ps1
```

### Option 2: Manual Docker Command

#### Using docker-compose:
```bash
docker-compose exec backend npm run migration:run
```

#### Using docker compose (v2):
```bash
docker compose exec backend npm run migration:run
```

### Option 3: Direct Container Access

1. Find the backend container name:
```bash
docker ps | grep backend
```

2. Execute migrations:
```bash
docker exec -it <backend-container-name> npm run migration:run
```

## Migration Order

The migrations run in this order:

1. **1704312000000-InitialSchema.ts** - Core database schema
2. **1704312001000-SeedCountries.ts** - Country data
3. **1704312002000-SeedCategories.ts** - Product categories
4. **1704312003000-SeedProductSegments.ts** - Product segments
5. **1704312004000-SeedRoles.ts** - User roles
6. **1704312005000-AddStockReservations.ts** - Stock reservation system
7. **1704312006000-AddDeliverySystem.ts** - Delivery tracking
8. **1704312007000-AddAuditAndSecurity.ts** - Audit logs and security alerts
9. **1704312008000-AddSupplierAutomation.ts** - **WhatsApp supplier automation tables**

## What Gets Created

### Supplier Automation Tables (Migration 1704312008000)

#### suppliers
- Stores supplier information
- Phone number (unique)
- Performance metrics
- Preferred categories

#### supplier_submissions
- WhatsApp message submissions
- Processing status tracking
- Extracted product data (JSONB)
- Validation status

#### processing_logs
- Detailed processing logs
- Stage tracking (webhook, AI extraction, validation, inventory)
- Error messages and metadata

### Indexes Created
- Performance indexes on frequently queried fields
- Foreign key indexes for joins
- Status and timestamp indexes for filtering

## Verifying Migrations

### Check Migration Status
```bash
docker-compose exec backend npm run migration:show
```

### Check Database Tables
```bash
docker-compose exec db psql -U postgres -d ecommerce -c "\dt"
```

### Verify Specific Tables
```bash
docker-compose exec db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;"
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:** Ensure the database container is running:
```bash
docker-compose ps db
docker-compose logs db
```

### Issue: "Migration already exists"

**Solution:** Check which migrations have been run:
```bash
docker-compose exec backend npm run migration:show
```

### Issue: "Permission denied"

**Solution:** Ensure the database user has proper permissions:
```bash
docker-compose exec db psql -U postgres -d ecommerce -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
```

### Issue: "Constraint violation"

**Solution:** This usually means data exists that violates the new constraints. You may need to:
1. Backup your data
2. Clean up invalid data
3. Re-run migrations

## Rolling Back Migrations

### Revert Last Migration
```bash
docker-compose exec backend npm run migration:revert
```

### Revert Multiple Migrations
Run the revert command multiple times:
```bash
docker-compose exec backend npm run migration:revert
docker-compose exec backend npm run migration:revert
```

## Creating New Migrations

### Generate a New Migration
```bash
cd backend
npm run migration:generate -- src/migrations/YourMigrationName
```

### Create Empty Migration
```bash
cd backend
npm run migration:create -- src/migrations/YourMigrationName
```

## Production Deployment

### Before Deployment
1. Test migrations in staging environment
2. Backup production database
3. Plan for rollback if needed

### During Deployment
1. Stop the application (optional, depends on migration)
2. Run migrations
3. Verify migrations completed successfully
4. Start the application
5. Monitor logs for errors

### Automated Deployment
Add to your deployment script:
```bash
# Run migrations automatically
docker-compose exec -T backend npm run migration:run

# Check exit code
if [ $? -ne 0 ]; then
    echo "Migration failed, rolling back..."
    docker-compose exec -T backend npm run migration:revert
    exit 1
fi
```

## Environment Variables

Ensure these are set correctly in your `.env` file:

```env
# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=ecommerce

# TypeORM Configuration
TYPEORM_SYNCHRONIZE=false  # Always false in production
TYPEORM_LOGGING=true       # Enable for debugging
TYPEORM_MIGRATIONS_RUN=false  # Manual migration control
```

## Best Practices

1. **Always backup before migrations** - Especially in production
2. **Test in staging first** - Never run untested migrations in production
3. **Use transactions** - Migrations should be atomic when possible
4. **Keep migrations small** - Easier to debug and rollback
5. **Document changes** - Add comments explaining complex migrations
6. **Version control** - Commit migrations with your code changes
7. **Monitor after deployment** - Watch logs for any issues

## Common Migration Patterns

### Adding a New Table
```typescript
await queryRunner.query(`
  CREATE TABLE "new_table" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" character varying(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_new_table" PRIMARY KEY ("id")
  )
`);
```

### Adding a Column
```typescript
await queryRunner.query(`
  ALTER TABLE "existing_table" 
  ADD COLUMN "new_column" character varying(255)
`);
```

### Adding an Index
```typescript
await queryRunner.query(`
  CREATE INDEX "IDX_table_column" 
  ON "table_name" ("column_name")
`);
```

### Adding a Foreign Key
```typescript
await queryRunner.query(`
  ALTER TABLE "child_table" 
  ADD CONSTRAINT "FK_child_parent" 
  FOREIGN KEY ("parent_id") 
  REFERENCES "parent_table"("id") 
  ON DELETE CASCADE
`);
```

## Support

If you encounter issues not covered in this guide:

1. Check application logs: `docker-compose logs backend`
2. Check database logs: `docker-compose logs db`
3. Review migration files in `backend/src/migrations/`
4. Consult TypeORM documentation: https://typeorm.io/migrations

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | Show migration status |
| `npm run migration:generate` | Generate migration from entities |
| `npm run migration:create` | Create empty migration |

## Related Documentation

- [TypeORM Migrations](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [WhatsApp Pipeline Integration](backend/src/whatsapp/PIPELINE_INTEGRATION.md)
- [Admin Endpoints](backend/src/admin/WHATSAPP_ADMIN_ENDPOINTS.md)
