# Fix: Supplier Submissions Tables Missing

## Problem

You're seeing these errors in your logs:
```
relation "supplier_submissions" does not exist
relation "audit_logs" does not exist
```

This means the database migrations haven't been run yet to create the necessary tables for the WhatsApp Supplier Automation feature.

## Quick Fix

### Option 1: Automated Fix Script (Recommended)

Run the diagnostic and fix script that will check your setup and run migrations:

**On Linux/Mac:**
```bash
chmod +x fix-database.sh
./fix-database.sh
```

**On Windows (PowerShell):**
```powershell
.\fix-database.ps1
```

This script will:
1. Check if containers are running
2. Verify database connectivity
3. Check which tables exist
4. Run all pending migrations
5. Verify tables were created
6. Restart the backend

### Option 2: Manual Migration

If you prefer to run migrations manually:

**Using docker-compose:**
```bash
docker-compose exec backend npm run migration:run
```

**Using docker compose (v2):**
```bash
docker compose exec backend npm run migration:run
```

After running migrations, restart the backend:
```bash
docker-compose restart backend
# or
docker compose restart backend
```

## What Gets Created

The migrations will create these tables:

### Supplier Automation Tables
- **suppliers** - Supplier information and performance metrics
- **supplier_submissions** - WhatsApp message submissions and processing status
- **processing_logs** - Detailed logs of each processing stage

### Audit & Security Tables (if not already created)
- **audit_logs** - System audit trail
- **security_alerts** - Security monitoring and alerts

## Verification

After running migrations, verify the tables exist:

```bash
# Check all tables
docker-compose exec db psql -U postgres -d ecommerce -c "\dt"

# Check specific table
docker-compose exec db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;"
```

## Expected Output

After successful migration, you should see:
```
✓ Migrations completed successfully
✓ supplier_submissions exists
✓ suppliers exists
✓ processing_logs exists
✓ audit_logs exists
✓ security_alerts exists
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:** Make sure Docker containers are running:
```bash
docker-compose ps
docker-compose up -d
```

### Issue: "Migration already executed"

**Solution:** This is normal if migrations were already run. Check migration status:
```bash
docker-compose exec backend npm run migration:show
```

### Issue: "Permission denied on script"

**Solution (Linux/Mac):** Make the script executable:
```bash
chmod +x fix-database.sh
```

### Issue: "Execution policy" error (Windows)

**Solution:** Run PowerShell as Administrator and set execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## After Fix

Once migrations are complete:

1. **Restart your application:**
   ```bash
   docker-compose restart backend
   ```

2. **Check logs to verify no more errors:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Access the WhatsApp admin dashboard:**
   - URL: http://localhost:3000/admin/whatsapp
   - Login with admin credentials

4. **Verify features are working:**
   - System health should show "HEALTHY"
   - All service statuses should be green
   - No error alerts should appear

## Additional Resources

- **Full Migration Guide:** See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **WhatsApp Pipeline Documentation:** See [backend/src/whatsapp/PIPELINE_INTEGRATION.md](backend/src/whatsapp/PIPELINE_INTEGRATION.md)
- **Admin Endpoints:** See [backend/src/admin/WHATSAPP_ADMIN_ENDPOINTS.md](backend/src/admin/WHATSAPP_ADMIN_ENDPOINTS.md)
- **Dashboard Enhancements:** See [backend/src/admin/WHATSAPP_DASHBOARD_ENHANCEMENTS.md](backend/src/admin/WHATSAPP_DASHBOARD_ENHANCEMENTS.md)

## Need Help?

If you continue to experience issues:

1. Check backend logs: `docker-compose logs backend`
2. Check database logs: `docker-compose logs db`
3. Verify environment variables in `.env` files
4. Ensure database credentials are correct
5. Check if database has enough disk space

## Prevention

To avoid this issue in future deployments:

1. **Add migration step to deployment script:**
   ```bash
   docker-compose exec -T backend npm run migration:run
   ```

2. **Use the provided deployment scripts:**
   - `deploy.sh` (Linux/Mac)
   - `deploy.ps1` (Windows)

3. **Enable automatic migrations** (optional, not recommended for production):
   In `.env`:
   ```
   TYPEORM_MIGRATIONS_RUN=true
   ```

## Summary

The error occurs because the database tables for the WhatsApp Supplier Automation feature haven't been created yet. Running the migrations will create all necessary tables and resolve the errors. Use the automated fix script for the easiest solution.
