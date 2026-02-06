# Docker Network Implementation - Summary

## What Was Changed

The application has been updated to use **internal Docker networking** for container-to-container communication instead of going through localhost.

## Architecture Change

### Before (Localhost Communication)
```
Browser → Frontend Container → localhost:3001 → Backend Container
```
- Frontend made direct calls to `http://localhost:3001/api`
- Went through host network stack
- Slower, less secure

### After (Internal Docker Network)
```
Browser → Frontend Container → Next.js API Routes → http://backend:3001/api → Backend Container
```
- Frontend uses Next.js API routes as proxy
- API routes use internal Docker network
- Faster, more secure, more flexible

## Files Created

### 1. API Proxy Routes
- `frontend/src/app/api/products/featured/route.ts`
- `frontend/src/app/api/products/trending/route.ts`
- `frontend/src/app/api/products/deals/route.ts`
- `frontend/src/app/api/products/new-arrivals/route.ts`

These routes proxy requests from the browser to the backend using the internal Docker network.

### 2. API Client Library
- `frontend/src/lib/api-client.ts`

Unified API client that automatically uses the correct URL based on execution context (server vs client).

### 3. Documentation
- `DOCKER_NETWORK_ARCHITECTURE.md` - Complete architecture documentation

## Files Modified

### 1. docker-compose.yml
Added `API_URL` environment variable for server-side requests:
```yaml
frontend:
  environment:
    API_URL: http://backend:3001/api  # Internal Docker network
    NEXT_PUBLIC_API_URL: http://localhost:3001/api  # Browser access
```

### 2. frontend/src/app/page.tsx
Changed from direct backend calls to Next.js API routes:
```typescript
// Before
fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/featured`)

// After
fetch('/api/products/featured')
```

### 3. Environment Files
- `frontend/.env`
- `frontend/.env.example`

Added `API_URL` for server-side requests.

## How to Deploy

### Quick Deploy
```powershell
.\fix-and-restart.ps1
```

### Manual Deploy
```powershell
# 1. Stop containers
docker-compose down

# 2. Rebuild (no cache to ensure new code is used)
docker-compose build --no-cache

# 3. Start containers
docker-compose up -d

# 4. Wait for services to be ready
Start-Sleep -Seconds 40

# 5. Open browser
Start-Process "http://localhost:3002"
```

## Benefits

### Performance
- ✅ **Faster**: Internal Docker network is more efficient than localhost
- ✅ **Lower latency**: No need to go through host network stack
- ✅ **Better resource usage**: Direct container-to-container communication

### Security
- ✅ **Backend URL hidden**: Client doesn't know backend URL
- ✅ **No CORS issues**: Requests come from same origin
- ✅ **Proxy layer**: Can add authentication, validation, rate limiting

### Scalability
- ✅ **Easy to scale**: Can add more backend instances
- ✅ **Load balancing**: Can add load balancer between frontend and backend
- ✅ **Caching**: Can add caching layer in proxy routes

### Development
- ✅ **Consistent**: Works the same in dev and production
- ✅ **Testable**: Easy to test and debug
- ✅ **Maintainable**: Clean separation of concerns

## Verification

### 1. Check Environment Variables
```powershell
docker exec ecommerce_frontend env | grep API_URL
```
Should show:
```
API_URL=http://backend:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Test Internal Network
```powershell
# Frontend should be able to reach backend
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health
```
Should return: `{"status":"ok"}`

### 3. Test from Browser
1. Open http://localhost:3002
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh page
5. Look for requests to `/api/products/*`
6. They should return 200 OK with product data

### 4. Check Logs
```powershell
# Frontend logs
docker logs ecommerce_frontend --tail 50

# Backend logs
docker logs ecommerce_backend --tail 50
```

Should see no errors related to network connectivity.

## Request Flow Example

### Homepage Loading Products

1. **Browser Request**
   ```
   GET http://localhost:3002/
   ```

2. **Next.js Renders Page**
   - Client-side code executes
   - Makes request to `/api/products/featured`

3. **Next.js API Route**
   ```
   GET /api/products/featured
   → Proxies to http://backend:3001/api/products/featured
   ```

4. **Backend Processes Request**
   ```
   GET http://backend:3001/api/products/featured
   → Queries PostgreSQL
   → Returns JSON
   ```

5. **Response Flows Back**
   ```
   Backend → Frontend API Route → Browser
   ```

## Troubleshooting

### Issue: Products not loading

**Check frontend logs:**
```powershell
docker logs ecommerce_frontend --tail 50
```

Look for errors like:
- `ECONNREFUSED` - Backend not reachable
- `ENOTFOUND` - DNS resolution failed
- `500 Internal Server Error` - Backend error

**Check backend logs:**
```powershell
docker logs ecommerce_backend --tail 50
```

### Issue: "backend" hostname not resolving

**Check Docker network:**
```powershell
docker network inspect ecommerce_network
```

Both `ecommerce_frontend` and `ecommerce_backend` should be listed.

**Test DNS resolution:**
```powershell
docker exec ecommerce_frontend ping -c 3 backend
```

Should resolve to backend container IP.

### Issue: API routes return 500

**Check API_URL environment variable:**
```powershell
docker exec ecommerce_frontend env | grep API_URL
```

Should be: `API_URL=http://backend:3001/api`

**Rebuild if needed:**
```powershell
docker-compose build --no-cache frontend
docker-compose up -d
```

## Rollback (If Needed)

If you need to rollback to the old architecture:

1. **Revert docker-compose.yml**
   ```yaml
   frontend:
     environment:
       NEXT_PUBLIC_API_URL: http://localhost:3001/api
   ```

2. **Revert frontend/src/app/page.tsx**
   ```typescript
   fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/featured`)
   ```

3. **Rebuild**
   ```powershell
   docker-compose build --no-cache frontend
   docker-compose up -d
   ```

## Next Steps

### Optional Enhancements

1. **Add Caching**
   - Cache product data in Redis
   - Reduce backend load
   - Faster response times

2. **Add Rate Limiting**
   - Protect against abuse
   - Limit requests per IP
   - Prevent DDoS

3. **Add Request Logging**
   - Log all API requests
   - Monitor performance
   - Debug issues

4. **Add Error Handling**
   - Better error messages
   - Retry logic
   - Fallback responses

## Summary

✅ **Implemented**: Internal Docker networking with Next.js API routes as proxy
✅ **Benefits**: Faster, more secure, more scalable
✅ **Deployment**: Run `.\fix-and-restart.ps1`
✅ **Documentation**: Complete architecture documentation provided

The application now uses Docker best practices for container communication, providing better performance and security while maintaining flexibility for future enhancements.
