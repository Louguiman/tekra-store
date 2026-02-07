# Admin Login Troubleshooting Guide

## Problem
Getting `{"message":"Unauthorized","statusCode":401}` when trying to log in with admin credentials.

## Diagnostic Steps

### Step 1: Check if Backend is Running

```bash
# Check backend container status
docker ps | grep backend

# Should show: ecommerce_backend ... Up ... (healthy)
```

### Step 2: Check Seeder Logs

```bash
# View backend logs for seeding information
docker logs ecommerce_backend | grep -i seed

# Expected output:
# [SeederService] 🌱 Starting automatic database seeding...
# [SeederService] Environment: production
# [SeederService] AUTO_SEED: true
# [SeederService] DEFAULT_ADMIN_PASSWORD: ***SET***
# Seeding countries...
# Seeding default admin user...
# Created default admin user:
#   Email: admin@ecommerce.local
#   Password: Admin123!
# [SeederService] ✅ Database seeding completed successfully!
```

### Step 3: Verify Admin User Exists

```bash
# Connect to database
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db

# Check if admin user exists
SELECT id, "fullName", email, phone, role, "passwordHash" IS NOT NULL as has_password
FROM "user"
WHERE email = 'admin@ecommerce.local';

# Expected output:
#  id | fullName              | email                   | phone            | role  | has_password
# ----+-----------------------+-------------------------+------------------+-------+--------------
#  1  | System Administrator  | admin@ecommerce.local   | +223 70 00 00 00 | admin | t

# Exit psql
\q
```

### Step 4: Check Auth Logs

```bash
# Try to login and watch logs in real-time
docker logs -f ecommerce_backend

# Then try logging in from the frontend
# Look for these log messages:
# [Auth] Validating password for user: admin@ecommerce.local (role: admin)
# [Auth] Password valid for user: admin@ecommerce.local
```

## Common Issues & Solutions

### Issue 1: Seeder Didn't Run

**Symptoms:**
- No seeding logs in backend
- Admin user doesn't exist in database

**Solution:**
```bash
# Check AUTO_SEED environment variable
docker exec -it ecommerce_backend env | grep AUTO_SEED

# If not set or false, enable it
# Edit docker-compose.yml or .env:
AUTO_SEED=true

# Restart backend
docker-compose restart backend

# Or run seeder manually
docker exec -it ecommerce_backend npm run seed
```

### Issue 2: Wrong Password

**Symptoms:**
- User exists in database
- Logs show: `[Auth] Invalid password for user: admin@ecommerce.local`

**Possible Causes:**
1. Using wrong password
2. Password was changed
3. Environment variable mismatch

**Solution:**
```bash
# Check what password was used during seeding
docker logs ecommerce_backend | grep "Admin password"

# Reset admin password manually
docker exec -it ecommerce_backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin123!', 12).then(hash => {
  console.log('New password hash:', hash);
  console.log('Run this SQL to update:');
  console.log(\`UPDATE \"user\" SET \"passwordHash\" = '\${hash}' WHERE email = 'admin@ecommerce.local';\`);
});
"

# Copy the SQL command and run it
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
UPDATE \"user\" 
SET \"passwordHash\" = 'PASTE_HASH_HERE' 
WHERE email = 'admin@ecommerce.local';
"
```

### Issue 3: User Has No Password Hash

**Symptoms:**
- Logs show: `[Auth] User has no password hash: admin@ecommerce.local`
- Database shows `has_password = f`

**Solution:**
```bash
# Delete and recreate user
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
DELETE FROM \"user\" WHERE email = 'admin@ecommerce.local';
"

# Run seeder again
docker exec -it ecommerce_backend npm run seed
```

### Issue 4: User Not Found

**Symptoms:**
- Logs show: `[Auth] User not found: admin@ecommerce.local`
- Database query returns no rows

**Solution:**
```bash
# Run seeder to create user
docker exec -it ecommerce_backend npm run seed

# Or create manually
docker exec -it ecommerce_backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin123!', 12).then(hash => {
  console.log('Password hash:', hash);
});
"

# Then insert into database
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
INSERT INTO \"user\" (\"fullName\", email, phone, \"passwordHash\", role, \"countryCode\", \"createdAt\", \"updatedAt\")
VALUES ('System Administrator', 'admin@ecommerce.local', '+223 70 00 00 00', 'PASTE_HASH_HERE', 'admin', 'ML', NOW(), NOW());
"
```

### Issue 5: Wrong Role

**Symptoms:**
- Login succeeds but returns: "Access denied. Admin or staff role required."
- Database shows role is 'customer' instead of 'admin'

**Solution:**
```bash
# Update user role
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
UPDATE \"user\" 
SET role = 'admin' 
WHERE email = 'admin@ecommerce.local';
"
```

## Testing Login

### Test 1: Direct API Call

```bash
# Test login endpoint directly
curl -X POST http://89.116.229.113:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecommerce.local",
    "password": "Admin123!"
  }'

# Expected response:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": {
#     "id": "...",
#     "fullName": "System Administrator",
#     "email": "admin@ecommerce.local",
#     "role": "admin"
#   }
# }
```

### Test 2: Via Frontend

1. Go to: `https://shop.sankaretech.com/admin/login`
2. Select "Email" login method
3. Enter:
   - Email: `admin@ecommerce.local`
   - Password: `Admin123!`
4. Open browser DevTools (F12) → Network tab
5. Click "Sign In"
6. Check the request/response

## Complete Reset Procedure

If nothing works, do a complete reset:

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove database volume (⚠️ DELETES ALL DATA)
docker volume rm tekra-store_postgres_data

# 3. Pull latest code
git pull origin main

# 4. Rebuild and start
docker-compose up -d --build

# 5. Wait for backend to be healthy (2-3 minutes)
docker ps | grep backend

# 6. Check seeder logs
docker logs ecommerce_backend | grep -i seed

# 7. Verify admin user
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
SELECT * FROM \"user\" WHERE email = 'admin@ecommerce.local';
"

# 8. Try logging in
```

## Environment Variables Checklist

Make sure these are set in docker-compose.yml or .env:

```bash
AUTO_SEED=true
DEFAULT_ADMIN_PASSWORD=Admin123!
DEFAULT_STAFF_PASSWORD=Staff123!
```

## Debugging Checklist

- [ ] Backend container is running and healthy
- [ ] Seeder logs show successful completion
- [ ] Admin user exists in database
- [ ] Admin user has passwordHash (not NULL)
- [ ] Admin user role is 'admin' (not 'customer')
- [ ] AUTO_SEED is set to 'true'
- [ ] Using correct password (check seeder logs)
- [ ] No typos in email/password
- [ ] Backend logs show auth attempt

## Getting Help

If still not working, provide these logs:

```bash
# 1. Seeder logs
docker logs ecommerce_backend | grep -i seed > seeder.log

# 2. Auth logs (try login first)
docker logs ecommerce_backend | grep -i auth > auth.log

# 3. Database check
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db -c "
SELECT id, \"fullName\", email, phone, role, 
       \"passwordHash\" IS NOT NULL as has_password,
       LENGTH(\"passwordHash\") as hash_length
FROM \"user\" 
WHERE email = 'admin@ecommerce.local';
" > db_check.log

# 4. Environment check
docker exec -it ecommerce_backend env | grep -E "AUTO_SEED|DEFAULT_ADMIN" > env_check.log
```

Share these 4 files for debugging assistance.
