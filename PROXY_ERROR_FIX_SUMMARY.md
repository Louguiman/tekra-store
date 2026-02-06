# Proxy 500 Error - Fix Summary

## Issue

API requests to `http://89.116.229.113:3002/api/backend/*` are returning **500 Internal Server Error**.

Example:
```
GET http://89.116.229.113:3002/api/backend/products?page=1&limit=12&countryCode=ML
Status: 500 Internal Server Error
```

## Root Cause

The proxy route is working correctly, but it's failing to connect to the backend container. This is typically caused by:
- Backend container not running or unhealthy
- Network connectivity issues between containers
- Backend not responding to requests

## What Was Fixed

### 1. Enhanced Proxy Logging
**File:** `frontend/src/app/api/backend/[...path]/route.ts`

Added detailed logging to help diagnose issues:
- Logs every request with method and path
- Logs backend URL being called
- Logs backend response status
- Logs detailed error information if request fails

**Example logs:**
```
[Proxy] GET products?page=1&limit=12&countryCode=ML
[Proxy] Backend URL: http://backend:3001/api/products?page=1&limit=12&countryCode=ML
[Proxy] Fetching from backend...
[Proxy] Backend response status: 200
```

### 2. Frontend Health Check Endpoint
**File:** `frontend/src/app/api/health/route.ts`

Created a health check endpoint that:
- Tests connectivity to backend
- Returns detailed status information
- Shows API_URL configuration
- Helps diagnose connectivity issues

**Usage:**
```bash
curl http://89.116.229.113:3002/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "frontend": "healthy",
  "backend": "healthy",
  "backendStatus": 200,
  "backendResponse": {"status": "ok"},
  "apiUrl": "http://backend:3001/api",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Missing Pages Created
**Files:** 
- `frontend/src/app/returns/page.tsx`
- `frontend/src/app/warranty/page.tsx`

Created missing pages that were linked in the footer to prevent 404 errors.

### 4. Diagnostic Tools

**File:** `diagnose-proxy.ps1`

Created a PowerShell script that:
- Checks container status
- Tests backend health
- Tests internal network connectivity
- Checks environment variables
- Shows recent logs
- Tests API endpoints
- Offers to restart services

**Usage:**
```powershell
.\diagnose-proxy.ps1
```

**File:** `PROXY_500_ERROR_TROUBLESHOOTING.md`

Created comprehensive troubleshooting guide with:
- Diagnostic steps
- Common issues and solutions
- Quick fix scripts
- Testing procedures
- Production deployment checklist

## How to Diagnose the Issue

### Quick Diagnostic

```powershell
# Run the diagnostic script
.\diagnose-proxy.ps1
```

This will automatically check:
1. Container status
2. Backend health
3. Network connectivity
4. Environment variables
5. Recent logs
6. API endpoints

### Manual Diagnostic

```powershell
# 1. Check containers are running
docker-compose ps

# 2. Check backend health
docker exec ecommerce_backend curl -f http://localhost:3001/api/health

# 3. Check frontend can reach backend
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health

# 4. Check environment variables
docker exec ecommerce_frontend env | grep API_URL

# 5. Check logs
docker logs ecommerce_frontend --tail 50
docker logs ecommerce_backend --tail 50

# 6. Test health endpoint
curl http://89.116.229.113:3002/api/health

# 7. Test products API
curl "http://89.116.229.113:3002/api/backend/products?limit=1"
```

## Common Solutions

### Solution 1: Restart Services

```powershell
docker-compose restart backend frontend
```

Wait 30 seconds for services to start, then test.

### Solution 2: Rebuild and Restart

```powershell
docker-compose build frontend
docker-compose up -d frontend
```

### Solution 3: Full Reset

```powershell
docker-compose down
docker-compose up -d
```

Wait for all services to be healthy, then test.

### Solution 4: Check Backend Logs

```powershell
docker logs ecommerce_backend --tail 100
```

Look for:
- Database connection errors
- Port binding errors
- Application startup errors

### Solution 5: Verify Network

```powershell
# Check network exists
docker network ls | grep ecommerce

# Inspect network
docker network inspect ecommerce_network

# Verify containers are on the network
docker network inspect ecommerce_network | grep -A 5 "Containers"
```

## Testing the Fix

### Test 1: Health Check

```bash
curl http://89.116.229.113:3002/api/health
```

Should return JSON with backend status.

### Test 2: Products API

```bash
curl "http://89.116.229.113:3002/api/backend/products?limit=5"
```

Should return products list.

### Test 3: Check Logs

```powershell
# Watch logs in real-time
docker logs -f ecommerce_frontend

# Make a request and watch for [Proxy] messages
```

## What to Look For in Logs

### Good Logs (Working)

```
[Proxy] GET products?page=1&limit=12
[Proxy] Backend URL: http://backend:3001/api/products?page=1&limit=12
[Proxy] Fetching from backend...
[Proxy] Backend response status: 200
```

### Bad Logs (Error)

```
[Proxy] Error for GET /products: FetchError: request to http://backend:3001/api/products failed
[Proxy] API_URL: http://backend:3001/api
[Proxy] Error details: { name: 'FetchError', message: 'ECONNREFUSED', ... }
```

Common error messages:
- `ECONNREFUSED` - Backend not running or not listening
- `ENOTFOUND` - DNS resolution failed (wrong hostname)
- `ETIMEDOUT` - Backend not responding (timeout)
- `ENETUNREACH` - Network connectivity issue

## Files Modified

1. `frontend/src/app/api/backend/[...path]/route.ts` - Enhanced logging
2. `frontend/src/app/api/health/route.ts` - New health check endpoint
3. `frontend/src/app/returns/page.tsx` - New returns page
4. `frontend/src/app/warranty/page.tsx` - New warranty page
5. `diagnose-proxy.ps1` - New diagnostic script
6. `PROXY_500_ERROR_TROUBLESHOOTING.md` - New troubleshooting guide

## Deployment

```powershell
# 1. Rebuild frontend with new changes
docker-compose build frontend

# 2. Restart frontend
docker-compose up -d frontend

# 3. Wait for service to be healthy
Start-Sleep -Seconds 30

# 4. Test health endpoint
curl http://89.116.229.113:3002/api/health

# 5. Test products API
curl "http://89.116.229.113:3002/api/backend/products?limit=1"

# 6. Check logs
docker logs ecommerce_frontend --tail 20
```

## Next Steps

1. **Run the diagnostic script:**
   ```powershell
   .\diagnose-proxy.ps1
   ```

2. **Check the health endpoint:**
   ```bash
   curl http://89.116.229.113:3002/api/health
   ```

3. **Review the logs:**
   ```powershell
   docker logs ecommerce_frontend --tail 50
   docker logs ecommerce_backend --tail 50
   ```

4. **If issues persist:**
   - Check `PROXY_500_ERROR_TROUBLESHOOTING.md` for detailed solutions
   - Verify backend is running: `docker-compose ps`
   - Verify database is connected: `docker logs ecommerce_backend | grep -i database`
   - Test internal network: `docker exec ecommerce_frontend wget -O- http://backend:3001/api/health`

## Support

The enhanced logging will now show exactly where the request is failing:
- If you see `[Proxy] Fetching from backend...` but no response status, the backend is not responding
- If you see `[Proxy] Backend response status: 500`, the backend is returning an error
- If you see `[Proxy] Error`, there's a network or connection issue

Check the logs after making a request to see the detailed error information.

---

**Status:** ✅ Enhanced logging and diagnostic tools added  
**Next:** Run diagnostic script to identify specific issue
