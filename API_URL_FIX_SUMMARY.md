# API URL Configuration Fix

## Issue Identified

The frontend was failing to fetch data from the backend API because the environment files had **incorrect API URLs**.

### Root Cause

The frontend environment files (`.env`, `.env.example`, `.env.local`) were configured with:
```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

This points to **port 80** (default HTTP port), but the backend is running on **port 3001**.

### Correct Configuration

The API URL should be:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## How Docker Compose Works

### Container Communication

When running in Docker Compose:

1. **Browser → Backend**: The browser (client-side) needs to access the backend at `http://localhost:3001/api`
   - This uses the **exposed port** from docker-compose
   - The browser is NOT inside the Docker network

2. **Frontend Container → Backend Container**: If the frontend made server-side requests, it would use `http://backend:3001/api`
   - This uses the **internal Docker network**
   - But Next.js makes client-side requests from the browser

### Environment Variable Priority

In Docker Compose, environment variables are set in this order (highest to lowest priority):

1. `docker-compose.yml` `environment:` section ✅ (Correct: `http://localhost:3001/api`)
2. `.env` file in project root (doesn't exist)
3. Frontend `.env` files ❌ (Was wrong: `http://localhost/api`)

**However**, Next.js bakes `NEXT_PUBLIC_*` variables into the build at **build time**, so the frontend container needs to be rebuilt after changing these values.

## Files Fixed

### 1. `frontend/.env`
```env
# Before
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_URL=http://localhost

# After
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### 2. `frontend/.env.example`
```env
# Before
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_URL=http://localhost

# After
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### 3. `frontend/.env.local`
```env
# Before
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_URL=http://localhost

# After
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## How to Apply the Fix

### Option 1: Automated Fix (Recommended)

Run the fix script:
```powershell
.\fix-and-restart.ps1
```

This script will:
1. Stop all containers
2. Remove old frontend image
3. Rebuild frontend with correct API URL
4. Start all containers
5. Wait for services to be ready
6. Open the frontend in your browser

### Option 2: Manual Fix

```powershell
# 1. Stop containers
docker-compose down

# 2. Rebuild frontend (no cache to ensure new env vars are used)
docker-compose build --no-cache frontend

# 3. Start containers
docker-compose up -d

# 4. Wait 30-60 seconds for services to start

# 5. Open browser
Start-Process "http://localhost:3002"
```

## Verification

### 1. Check Environment Variables in Container

```powershell
# Check what API URL the frontend container has
docker exec ecommerce_frontend env | grep NEXT_PUBLIC_API_URL
```

Should output:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Test Backend API Directly

```powershell
# Test from your host machine (not inside container)
curl http://localhost:3001/api/health
curl http://localhost:3001/api/products/featured?limit=8
```

Should return JSON responses.

### 3. Check Frontend Network Requests

1. Open http://localhost:3002 in browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh page
5. Look for requests to `http://localhost:3001/api/products/...`
6. They should return `200 OK` with JSON data

## Why This Happened

The environment files were likely created with a different setup in mind:
- Perhaps using nginx as a reverse proxy on port 80
- Or a different port configuration
- The docker-compose.yml has the correct configuration, but the `.env` files didn't match

## Docker Compose Configuration

The `docker-compose.yml` already has the correct configuration:

```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}
    NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3002}
```

The `:-` syntax means "use environment variable if set, otherwise use default value".

Since there's no root `.env` file, it uses the defaults, which are correct!

## Important Notes

### Next.js Environment Variables

- `NEXT_PUBLIC_*` variables are **embedded at build time**
- Changing them requires **rebuilding the frontend**
- They are accessible in the browser (client-side)
- They cannot be changed at runtime

### Port Mapping

```yaml
backend:
  ports:
    - "3001:3001"  # Host:Container

frontend:
  ports:
    - "3002:3000"  # Host:Container (Next.js runs on 3000 inside)
```

- Backend: Accessible at `localhost:3001` from host
- Frontend: Accessible at `localhost:3002` from host (maps to port 3000 inside container)

## Testing After Fix

### 1. Homepage Should Load Products

Visit http://localhost:3002 and you should see:
- Featured products
- Trending products
- Deals
- New arrivals

### 2. No Console Errors

Open browser console (F12) - should see no errors like:
- ❌ `Failed to fetch`
- ❌ `net::ERR_CONNECTION_REFUSED`
- ❌ `CORS error`

### 3. API Requests Succeed

In Network tab, all requests to `/api/products/*` should show:
- ✅ Status: 200 OK
- ✅ Type: xhr or fetch
- ✅ Response: JSON data

## Troubleshooting

### Issue: Still getting connection errors

**Solution:**
```powershell
# Ensure containers are running
docker ps

# Check backend logs
docker logs ecommerce_backend --tail 50

# Check frontend logs
docker logs ecommerce_frontend --tail 50

# Verify backend is accessible
curl http://localhost:3001/api/health
```

### Issue: Frontend shows old API URL

**Solution:**
```powershell
# Frontend needs to be rebuilt
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Issue: CORS errors

**Solution:**
The CORS configuration in `backend/src/main.ts` already allows all localhost origins. If you still see CORS errors:
1. Clear browser cache
2. Hard refresh (Ctrl + Shift + R)
3. Check backend logs for CORS-related errors

## Summary

✅ **Fixed**: All frontend `.env` files now have correct API URL
✅ **Action Required**: Rebuild frontend container to apply changes
✅ **Command**: Run `.\fix-and-restart.ps1` or manually rebuild

The issue was a simple configuration mismatch - the environment files had the wrong port number. After rebuilding the frontend with the correct configuration, everything should work perfectly!
