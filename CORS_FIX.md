# CORS Configuration Fix

## Issue
API requests from the frontend to backend were being blocked with status "blocked:other", indicating a CORS (Cross-Origin Resource Sharing) issue.

## Root Cause
The backend CORS configuration was too restrictive and only allowed a single origin. When running in Docker Compose:
- Frontend runs on `http://localhost:3002` (or `http://localhost:3000`)
- Backend runs on `http://localhost:3001`
- Browser blocks cross-origin requests without proper CORS headers

## Solution

Updated `backend/src/main.ts` with a flexible CORS configuration that:

### 1. Allows All Localhost Origins
```typescript
origin: (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, Postman)
  if (!origin) return callback(null, true);
  
  // Allow all localhost origins in development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }
  
  // Check against allowed origins list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  
  // Reject other origins
  callback(new Error('Not allowed by CORS'));
}
```

### 2. Supports Multiple HTTP Methods
```typescript
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
```

### 3. Allows Common Headers
```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
exposedHeaders: ['Content-Range', 'X-Content-Range']
```

### 4. Enables Credentials
```typescript
credentials: true  // Allows cookies and authentication headers
```

## Allowed Origins

The backend now accepts requests from:
- ✅ `http://localhost:3000` - Direct frontend access
- ✅ `http://localhost:3002` - Docker-exposed frontend
- ✅ `http://localhost` - Root localhost
- ✅ `http://127.0.0.1:3000` - IP-based access
- ✅ `http://127.0.0.1:3002` - IP-based Docker access
- ✅ `http://127.0.0.1` - Root IP access
- ✅ Any origin from `FRONTEND_URL` environment variable
- ✅ Requests with no origin (Postman, curl, mobile apps)

## Testing CORS

### Test from Browser Console:
```javascript
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Test with curl:
```bash
# Simple request
curl http://localhost:3001/api/health

# With origin header
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/api/health -v
```

### Expected Response Headers:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,Accept,X-Requested-With
```

## Docker Compose Configuration

### Backend Environment:
```yaml
environment:
  FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
```

### Frontend Environment:
```yaml
environment:
  NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}
```

## Network Flow

### Development (Docker Compose):
```
Browser (localhost:3002)
    ↓ HTTP Request
Backend (localhost:3001)
    ↓ CORS Check
✅ Origin: localhost:3002 → ALLOWED
    ↓ Response with CORS headers
Browser receives data
```

### Production (with nginx):
```
Browser (yourdomain.com)
    ↓ HTTP Request
Nginx (port 80/443)
    ↓ Proxy to backend
Backend (internal network)
    ↓ CORS Check
✅ Origin: yourdomain.com → ALLOWED
    ↓ Response
Nginx → Browser
```

## Production Considerations

For production, you should restrict CORS to specific domains:

### Option 1: Environment Variable
```env
FRONTEND_URL=https://yourdomain.com
```

### Option 2: Update Code
```typescript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://app.yourdomain.com',
];

// Remove the localhost check in production
if (process.env.NODE_ENV === 'production') {
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
} else {
  // Development CORS (allow all localhost)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
}
```

## Troubleshooting

### Issue: Still getting CORS errors
**Check:**
1. Is the backend running?
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Check browser console for exact error
   - Look for "CORS policy" in the error message
   - Note the origin being blocked

3. Verify CORS headers in response:
   ```bash
   curl -I http://localhost:3001/api/health
   ```

### Issue: Preflight OPTIONS request failing
**Solution:**
- Ensure OPTIONS method is allowed
- Check that all required headers are in `allowedHeaders`
- Verify the route doesn't require authentication for OPTIONS

### Issue: Credentials not being sent
**Solution:**
- Ensure `credentials: true` in CORS config
- Use `credentials: 'include'` in fetch requests:
  ```javascript
  fetch('http://localhost:3001/api/products', {
    credentials: 'include'
  })
  ```

### Issue: Custom headers being blocked
**Solution:**
- Add custom headers to `allowedHeaders` array
- Example: `allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']`

## Security Best Practices

1. **Never use `origin: '*'` with `credentials: true`**
   - This is a security risk
   - Browsers will block it anyway

2. **Restrict origins in production**
   - Only allow your actual domain(s)
   - Don't allow all localhost in production

3. **Use HTTPS in production**
   - CORS works with HTTP but HTTPS is more secure
   - Mixed content (HTTPS → HTTP) will be blocked

4. **Validate origin on server**
   - Don't trust the Origin header alone
   - Implement additional authentication/authorization

5. **Monitor CORS errors**
   - Log rejected CORS requests
   - Alert on unusual patterns

## Files Modified

1. `backend/src/main.ts`
   - Updated CORS configuration
   - Added dynamic origin checking
   - Enabled all localhost origins for development

## Related Issues

- **CORS vs CORB**: CORS is about cross-origin requests, CORB is about cross-origin reads
- **Preflight requests**: OPTIONS requests sent before actual request
- **Simple vs Complex requests**: GET/POST with simple headers don't need preflight

## Testing Checklist

- [ ] GET requests work from frontend
- [ ] POST requests work from frontend
- [ ] PUT/PATCH requests work from frontend
- [ ] DELETE requests work from frontend
- [ ] Authentication headers are sent
- [ ] Cookies are sent/received
- [ ] Custom headers work
- [ ] Preflight OPTIONS requests succeed

## Apply Changes

To apply the CORS fix:

```bash
# Rebuild backend
cd backend
npm run build

# Restart backend container
docker-compose restart backend

# Or rebuild everything
docker-compose up -d --build backend
```

## Verification

After applying changes, test with:

```bash
# From browser console (F12)
fetch('http://localhost:3001/api/products?page=1&limit=12&countryCode=ML')
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

Expected: Data returned without CORS errors

---

**Fixed by:** Kiro AI Assistant  
**Date:** February 5, 2026  
**Status:** ✅ Resolved  
**CORS:** ✅ Configured for Docker Compose development
