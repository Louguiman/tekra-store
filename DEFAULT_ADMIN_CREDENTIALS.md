# Default Admin Credentials

## Overview

The database seeder automatically creates default admin and staff users on first deployment. These accounts are for initial setup and testing.

## Default Admin User

### Login Credentials
- **Email**: `admin@ecommerce.local`
- **Phone**: `+223 70 00 00 00`
- **Password**: `Admin123!`
- **Role**: Admin (full system access)
- **Country**: Mali (ML)

### Login URLs
- **Production**: `https://shop.sankaretech.com/admin/login`
- **Local**: `http://localhost:3000/admin/login`

### Login Methods
You can log in using either:
1. **Email + Password**
2. **Phone + Password**

## Default Staff User

### Login Credentials
- **Email**: `staff@ecommerce.local`
- **Phone**: `+223 70 00 00 01`
- **Password**: `Staff123!`
- **Role**: Staff (limited admin access)
- **Country**: Mali (ML)

## Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS:**

1. **Change Default Passwords Immediately**
   - These are well-known default credentials
   - Change them immediately after first login
   - Use strong, unique passwords

2. **Production Deployment**
   - Never use default credentials in production
   - Set custom passwords via environment variables
   - Consider disabling default user creation in production

3. **Environment Variables**
   - `DEFAULT_ADMIN_PASSWORD` - Override default admin password
   - `DEFAULT_STAFF_PASSWORD` - Override default staff password

## Customizing Default Passwords

### Via Environment Variables

```bash
# In .env file or docker-compose.yml
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_STAFF_PASSWORD=AnotherSecurePassword456!
```

### Via Docker Compose

```yaml
backend:
  environment:
    DEFAULT_ADMIN_PASSWORD: ${DEFAULT_ADMIN_PASSWORD:-Admin123!}
    DEFAULT_STAFF_PASSWORD: ${DEFAULT_STAFF_PASSWORD:-Staff123!}
```

## How Seeding Works

### Automatic Seeding

The seeder runs automatically when:
1. Database is first initialized
2. Migrations are run
3. Backend starts with empty database

### Manual Seeding

You can manually run the seeder:

```bash
# Inside backend container
npm run seed

# Or via docker
docker exec -it ecommerce_backend npm run seed
```

### Idempotent Seeding

The seeder is **idempotent** - safe to run multiple times:
- Checks if users already exist before creating
- Won't create duplicates
- Won't overwrite existing users

## Seeder Code Location

The default admin user is created in:
```
backend/src/seeds/database.seeder.ts
```

Method: `seedDefaultAdminUser()`

## What Gets Seeded

The database seeder creates:
1. ✅ **Countries** - Mali, Côte d'Ivoire, Burkina Faso
2. ✅ **Categories** - Smartphones, Laptops, Gaming, etc.
3. ✅ **Product Segments** - Premium, Mid-range, Refurbished
4. ✅ **Roles** - Admin, Staff, Customer
5. ✅ **Default Admin User** - admin@ecommerce.local
6. ✅ **Default Staff User** - staff@ecommerce.local
7. ✅ **Delivery Methods** - For each country
8. ✅ **Pickup Points** - For Côte d'Ivoire and Burkina Faso

## Testing the Admin Login

### Step 1: Access Admin Login
```
https://shop.sankaretech.com/admin/login
```

### Step 2: Choose Login Method
- Select "Email" or "Phone" from dropdown

### Step 3: Enter Credentials
**Using Email:**
- Email: `admin@ecommerce.local`
- Password: `Admin123!`

**Using Phone:**
- Phone: `+223 70 00 00 00`
- Password: `Admin123!`

### Step 4: Access Admin Dashboard
After successful login, you'll be redirected to:
```
https://shop.sankaretech.com/admin
```

## Troubleshooting

### "User not found" Error

**Cause**: Database not seeded yet

**Solution**:
```bash
# Run seeder manually
docker exec -it ecommerce_backend npm run seed
```

### "Invalid credentials" Error

**Cause**: Wrong password or user doesn't exist

**Solutions**:
1. Verify you're using the correct password
2. Check if custom password was set via env vars
3. Run seeder to create user if missing

### Can't Access Admin Dashboard

**Cause**: User exists but role is not 'admin'

**Solution**:
```sql
-- Connect to database
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db

-- Check user role
SELECT id, "fullName", email, role FROM "user" WHERE email = 'admin@ecommerce.local';

-- Update role if needed
UPDATE "user" SET role = 'admin' WHERE email = 'admin@ecommerce.local';
```

## Changing Password After First Login

### Via Admin Dashboard
1. Log in with default credentials
2. Go to Profile/Settings
3. Change password
4. Log out and log back in with new password

### Via Database (Emergency)
```bash
# Generate new password hash
docker exec -it ecommerce_backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('NewPassword123!', 12).then(hash => console.log(hash));
"

# Update in database
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
UPDATE \"user\" 
SET \"passwordHash\" = 'PASTE_HASH_HERE' 
WHERE email = 'admin@ecommerce.local';
"
```

## Production Best Practices

1. **Set Custom Passwords**
   ```bash
   DEFAULT_ADMIN_PASSWORD=<strong-random-password>
   DEFAULT_STAFF_PASSWORD=<strong-random-password>
   ```

2. **Disable Default Users** (Optional)
   - Comment out `seedDefaultAdminUser()` in seeder
   - Create admin users manually via API or database

3. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use password manager

4. **Enable 2FA** (Future Enhancement)
   - Add two-factor authentication
   - Use authenticator apps
   - SMS verification

5. **Monitor Admin Access**
   - Check audit logs regularly
   - Review admin actions
   - Set up alerts for suspicious activity

## Summary

✅ Default admin user automatically created on first deployment  
✅ Email: `admin@ecommerce.local` | Password: `Admin123!`  
✅ Phone: `+223 70 00 00 00` | Password: `Admin123!`  
✅ Change password immediately after first login  
✅ Use environment variables for custom passwords  
✅ Seeder is idempotent and safe to run multiple times  

🎮 Ready to log in and manage your gaming e-commerce platform!
