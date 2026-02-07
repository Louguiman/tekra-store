# Automatic Database Seeding

## Overview

The backend now automatically seeds the database on startup using NestJS's `OnModuleInit` lifecycle hook. This ensures that essential data (countries, categories, roles, default admin user, etc.) is always available.

## How It Works

### SeederService
Located at `backend/src/seeds/seeder.service.ts`, this service implements `OnModuleInit`:

```typescript
@Injectable()
export class SeederService implements OnModuleInit {
  async onModuleInit() {
    if (process.env.AUTO_SEED === 'true') {
      const seeder = new DatabaseSeeder(this.dataSource);
      await seeder.run();
    }
  }
}
```

### Execution Flow

```
1. Backend starts
   ↓
2. NestJS initializes modules
   ↓
3. SeederModule loads
   ↓
4. SeederService.onModuleInit() called
   ↓
5. Checks AUTO_SEED environment variable
   ↓
6. Runs DatabaseSeeder if enabled
   ↓
7. Seeds: Countries, Categories, Roles, Admin User, etc.
   ↓
8. Backend continues normal startup
```

## Configuration

### Environment Variables

```bash
# Enable/disable auto-seeding
AUTO_SEED=true  # Default: true

# Customize default passwords
DEFAULT_ADMIN_PASSWORD=Admin123!
DEFAULT_STAFF_PASSWORD=Staff123!
```

### Docker Compose

Already configured in `docker-compose.yml`:

```yaml
backend:
  environment:
    AUTO_SEED: ${AUTO_SEED:-true}
    DEFAULT_ADMIN_PASSWORD: ${DEFAULT_ADMIN_PASSWORD:-Admin123!}
    DEFAULT_STAFF_PASSWORD: ${DEFAULT_STAFF_PASSWORD:-Staff123!}
```

## What Gets Seeded

The seeder creates:

1. **Countries**
   - Mali (ML) - FCFA
   - Côte d'Ivoire (CI) - FCFA
   - Burkina Faso (BF) - FCFA

2. **Categories**
   - Smartphones, Laptops, Tablets
   - Gaming, Audio, Accessories
   - Computers, Monitors, Storage, Networking

3. **Product Segments**
   - Premium
   - Mid-range
   - Refurbished

4. **Roles**
   - Admin
   - Staff
   - Customer

5. **Default Admin User**
   - Email: `admin@ecommerce.local`
   - Phone: `+223 70 00 00 00`
   - Password: `Admin123!` (or `DEFAULT_ADMIN_PASSWORD`)
   - Role: Admin

6. **Default Staff User**
   - Email: `staff@ecommerce.local`
   - Phone: `+223 70 00 00 01`
   - Password: `Staff123!` (or `DEFAULT_STAFF_PASSWORD`)
   - Role: Staff

7. **Delivery Methods**
   - Own delivery for Mali
   - Partner logistics for CI and BF

8. **Pickup Points**
   - Multiple locations in CI and BF

## Idempotent Seeding

The seeder is **idempotent** - safe to run multiple times:
- Checks if data already exists before creating
- Won't create duplicates
- Won't overwrite existing data
- Logs what was created vs. what already existed

## Deployment

### First Deployment

```bash
# On your server
cd /path/to/tekra-store
git pull origin main
docker-compose up -d --build backend
```

The seeder will run automatically on first startup and create all necessary data.

### Checking Seeder Logs

```bash
# View backend logs to see seeding progress
docker logs ecommerce_backend

# Expected output:
# [SeederService] Starting automatic database seeding...
# Seeding countries...
# Created country: Mali (ML)
# Created country: Côte d'Ivoire (CI)
# ...
# Seeding default admin user...
# Created default admin user:
#   Email: admin@ecommerce.local
#   Password: Admin123!
# [SeederService] Database seeding completed successfully!
```

## Disabling Auto-Seeding

If you want to disable automatic seeding:

```bash
# In .env file
AUTO_SEED=false
```

Or in docker-compose:

```yaml
backend:
  environment:
    AUTO_SEED: false
```

## Manual Seeding

You can still run the seeder manually:

```bash
# Inside backend container
docker exec -it ecommerce_backend npm run seed

# Or from host
cd backend
npm run seed
```

## Error Handling

The seeder is designed to be fault-tolerant:
- Errors during seeding are logged but don't crash the app
- Backend continues to start even if seeding fails
- Each seed operation is independent (failure in one doesn't stop others)

## Testing

After deployment, verify the admin user was created:

```bash
# Connect to database
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db

# Check if admin user exists
SELECT id, "fullName", email, phone, role 
FROM "user" 
WHERE email = 'admin@ecommerce.local';

# Expected output:
#  id | fullName              | email                   | phone            | role
# ----+-----------------------+-------------------------+------------------+-------
#  1  | System Administrator  | admin@ecommerce.local   | +223 70 00 00 00 | admin
```

## Login with Default Admin

1. Go to: `https://shop.sankaretech.com/admin/login`
2. Select "Email" login method
3. Enter:
   - Email: `admin@ecommerce.local`
   - Password: `Admin123!`
4. Click "Sign In"
5. You should be redirected to the admin dashboard

## Security Best Practices

⚠️ **IMPORTANT:**

1. **Change Default Password**
   - Log in with default credentials
   - Change password immediately
   - Use a strong, unique password

2. **Custom Passwords in Production**
   ```bash
   DEFAULT_ADMIN_PASSWORD=<strong-random-password>
   DEFAULT_STAFF_PASSWORD=<strong-random-password>
   ```

3. **Consider Disabling Auto-Seed in Production**
   - After initial setup, set `AUTO_SEED=false`
   - Prevents accidental re-seeding
   - Manage users through admin dashboard

## Troubleshooting

### Seeder Not Running

**Check logs:**
```bash
docker logs ecommerce_backend | grep -i seed
```

**Verify AUTO_SEED is enabled:**
```bash
docker exec -it ecommerce_backend env | grep AUTO_SEED
```

### Admin User Not Created

**Run seeder manually:**
```bash
docker exec -it ecommerce_backend npm run seed
```

**Check database:**
```bash
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "SELECT * FROM \"user\" WHERE role = 'admin';"
```

### Seeding Errors

**View full logs:**
```bash
docker logs ecommerce_backend --tail 100
```

**Common issues:**
- Database not ready (wait a few seconds and restart)
- Migration not run (run migrations first)
- Connection issues (check database credentials)

## Files Modified

- `backend/src/seeds/seeder.service.ts` - New service with OnModuleInit
- `backend/src/seeds/seeder.module.ts` - New module for seeder
- `backend/src/app.module.ts` - Import SeederModule
- `docker-compose.yml` - Add AUTO_SEED environment variables

## Summary

✅ **Automatic seeding** on backend startup  
✅ **OnModuleInit** lifecycle hook  
✅ **Idempotent** - safe to run multiple times  
✅ **Configurable** via environment variables  
✅ **Fault-tolerant** - errors don't crash app  
✅ **Default admin** user created automatically  
✅ **Production-ready** with custom passwords  

The database will be automatically seeded on next backend restart! 🎮
