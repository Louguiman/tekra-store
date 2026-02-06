# Proxy 500 Error Troubleshooting Guide

## Issue Description

The frontend proxy is returning 500 Internal Server Error when trying to connect to the backend API.

**Example Error:**
```
GET http://89.116.229.113:3002/api/backend/products?page=1&limit=12&countryCode=ML&sortBy=createdAt&sortOrder=desc
Status: 500 Internal Server Error
```

## Root Cause

The proxy route (`/api/backend/[...path]`) is correctly receiving requests but failing to connect to the backend container. This is typically caused by:

1. Backend container not running or unhealthy
2. Network connectivity issues between containers
3. Incorrect `API_URL` environment variable
4. Backend not responding to requests

## Diagnostic Steps

### Step 1: Check Container Status

```powershell
# Check if all containers are running
docker ps

# Expected output should show:
# - ecommerce_postgres (healthy)
# - ecommerce_redis (healthy)
# - ecommerce_backend (healthy)
# - ecommerce_frontend (healthy)
```

### Step 2: Check Backend Health

```powershell
# Check backend health directly
docker exec ecommerce_backend curl -f http://localhost:3001/api/health

# Should return: {"status":"ok"}
```

### Step 3: Check Frontend Health

```powershell
# Check frontend health endpoint
curl http://89.116.229.113:3002/api/health

# Should return JSON with backend connectivity status
```

### Step 4: Check Backend Logs

```powershell
# View backend logs
docker logs ecommerce_backend --tail 100

# Look for:
# - Server started messages
# - Database connection success
# - Any error messages
```

### Step 5: Check Frontend Logs

```powershell
# View frontend logs
docker logs ecommerce_frontend --tail 100

# Look for:
# - [Proxy] log messages
# - Connection errors
# - API_URL value
```

### Step 6: Test Internal Network

```powershell
# Test if frontend can reach backend
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health

# Should return: {"status":"ok"}
```

### Step 7: Check Environment Variables

```powershell
# Check frontend environment
docker exec ecommerce_frontend env | grep API_URL

# Should show: API_URL=http://backend:3001/api
```

## Common Issues and Solutions

### Issue 1: Backend Container Not Running

**Symptoms:**
- `docker ps` doesn't show `ecommerce_backend`
- Frontend logs show connection refused errors

**Solution:**
```powershell
# Restart backend
docker-compose up -d backend

# Wait for backend to be healthy
docker-compose ps backend
```

### Issue 2: Backend Unhealthy

**Symptoms:**
- Backend container shows "unhealthy" status
- Backend logs show database connection errors

**Solution:**
```powershell
# Check database is running
docker-compose ps postgres

# Restart backend
docker-compose restart backend

# Check logs
docker logs ecommerce_backend --tail 50
```

### Issue 3: Network Connectivity Issues

**Symptoms:**
- Containers running but can't communicate
- "Network unreachable" errors in logs

**Solution:**
```powershell
# Recreate network
docker-compose down
docker-compose up -d

# Verify network
docker network inspect ecommerce_network
```

### Issue 4: Wrong API_URL

**Symptoms:**
- Frontend logs show wrong backend URL
- 404 or connection errors

**Solution:**
```powershell
# Update .env file
# Ensure: API_URL=http://backend:3001/api

# Rebuild and restart
docker-compose build frontend
docker-compose up -d frontend
```

### Issue 5: Backend Not Responding

**Symptoms:**
- Backend container healthy but not responding
- Timeout errors in frontend logs

**Solution:**
```powershell
# Check backend is listening
docker exec ecommerce_backend netstat -tlnp | grep 3001

# Restart backend
docker-compose restart backend

# Check if migrations ran
docker exec ecommerce_backend npm run migration:run
```

## Quick Fix Script

Create a file `fix-proxy-error.ps1`:

```powershell
Write-Host "=== Proxy Error Diagnostic ===" -ForegroundColor Cyan

# Step 1: Check containers
Write-Host "`n1. Checking container status..." -ForegroundColor Yellow
docker-compose ps

# Step 2: Check backend health
Write-Host "`n2. Checking backend health..." -ForegroundColor Yellow
docker exec ecommerce_backend curl -f http://localhost:3001/api/health 2>&1

# Step 3: Check frontend can reach backend
Write-Host "`n3. Testing internal network..." -ForegroundColor Yellow
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health 2>&1

# Step 4: Check environment
Write-Host "`n4. Checking API_URL..." -ForegroundColor Yellow
docker exec ecommerce_frontend env | grep API_URL

# Step 5: Check logs
Write-Host "`n5. Recent backend logs..." -ForegroundColor Yellow
docker logs ecommerce_backend --tail 20

Write-Host "`n6. Recent frontend logs..." -ForegroundColor Yellow
docker logs ecommerce_frontend --tail 20

# Step 7: Offer to restart
Write-Host "`n=== Diagnostic Complete ===" -ForegroundColor Cyan
$restart = Read-Host "Do you want to restart the services? (y/n)"

if ($restart -eq "y") {
    Write-Host "`nRestarting services..." -ForegroundColor Yellow
    docker-compose restart backend frontend
    
    Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host "`nChecking health..." -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host "`nTesting API..." -ForegroundColor Yellow
    curl http://localhost:3002/api/health
}
```

## Enhanced Logging

The proxy route now includes detailed logging:

```typescript
// Logs show:
[Proxy] GET products?page=1&limit=12&countryCode=ML
[Proxy] Backend URL: http://backend:3001/api/products?page=1&limit=12&countryCode=ML
[Proxy] Fetching from backend...
[Proxy] Backend response status: 200
```

If there's an error:
```typescript
[Proxy] Error for GET /products: FetchError: request to http://backend:3001/api/products failed
[Proxy] API_URL: http://backend:3001/api
[Proxy] Error details: { name: 'FetchError', message: '...', stack: '...' }
```

## Testing the Fix

### Test 1: Health Check

```bash
# Should return backend connectivity status
curl http://89.116.229.113:3002/api/health
```

Expected response:
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

### Test 2: Products API

```bash
# Should return products
curl http://89.116.229.113:3002/api/backend/products?limit=5
```

Expected response:
```json
{
  "products": [...],
  "total": 100,
  "page": 1,
  "limit": 5
}
```

### Test 3: Check Logs

```powershell
# Watch frontend logs in real-time
docker logs -f ecommerce_frontend

# Make a request and watch the logs
# You should see [Proxy] messages
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Verify `API_URL=http://backend:3001/api` in docker-compose.yml
- [ ] Ensure all containers are on the same network (`ecommerce_network`)
- [ ] Backend health check is passing
- [ ] Frontend health check is passing
- [ ] Test proxy with sample API call
- [ ] Check logs for any errors
- [ ] Verify database migrations have run
- [ ] Test from external IP (not just localhost)

## Environment Variables Reference

### Frontend Container

```env
# Server-side API URL (internal Docker network)
API_URL=http://backend:3001/api

# Client-side API URL (browser accessible)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Backend Container

```env
PORT=3001
DB_HOST=postgres
DB_PORT=5432
FRONTEND_URL=http://localhost:3000
```

## Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                  (ecommerce_network)                     │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   Frontend   │         │   Backend    │             │
│  │  Container   │────────▶│  Container   │             │
│  │              │         │              │             │
│  │ Port: 3000   │         │ Port: 3001   │             │
│  │ (internal)   │         │ (internal)   │             │
│  └──────┬───────┘         └──────┬───────┘             │
│         │                        │                      │
│         │                        │                      │
│         │                 ┌──────▼───────┐             │
│         │                 │  PostgreSQL  │             │
│         │                 │  Container   │             │
│         │                 │              │             │
│         │                 │ Port: 5432   │             │
│         │                 └──────────────┘             │
└─────────┼──────────────────────────────────────────────┘
          │
          │ Port Mapping
          │
          ▼
    Host: 3002 → Container: 3000
```

## Request Flow

```
1. Browser → http://89.116.229.113:3002/api/backend/products
2. Frontend Container (Next.js) → Proxy Route
3. Proxy Route → http://backend:3001/api/products (internal network)
4. Backend Container → Process Request
5. Backend → Return Response
6. Proxy → Forward Response
7. Browser ← Receive Response
```

## Support

If the issue persists after following this guide:

1. Collect logs:
   ```powershell
   docker logs ecommerce_backend > backend.log
   docker logs ecommerce_frontend > frontend.log
   docker-compose ps > containers.log
   ```

2. Check network:
   ```powershell
   docker network inspect ecommerce_network > network.log
   ```

3. Review the logs for specific error messages

4. Check if the backend is accessible from the host:
   ```powershell
   curl http://localhost:3001/api/health
   ```

---

**Last Updated:** 2024
**Status:** Active troubleshooting guide
