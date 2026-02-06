# Backend CORS Configuration for Vercel Frontend

## Current CORS Configuration

The backend already has flexible CORS configuration that allows:
- ✅ All localhost origins (for development)
- ✅ Custom origins via `FRONTEND_URL` environment variable
- ✅ Credentials (cookies, sessions)
- ✅ All standard HTTP methods

**File:** `backend/src/main.ts`

## For Production Deployment

### Option 1: Using Environment Variable (Recommended)

Simply set the `FRONTEND_URL` environment variable to your Vercel URL:

```bash
# In your .env file or server environment
FRONTEND_URL=https://your-vercel-app.vercel.app
```

The backend will automatically allow this origin.

### Option 2: Multiple Production URLs

If you have multiple frontend URLs (staging, production, custom domain), update the `allowedOrigins` array:

```typescript
// backend/src/main.ts

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
  'http://127.0.0.1',
  'https://your-vercel-app.vercel.app',        // Vercel default domain
  'https://your-staging-app.vercel.app',       // Staging environment
  'https://shop.yourdomain.com',               // Custom domain
  'https://www.yourdomain.com',                // WWW version
];
```

### Option 3: Wildcard for Vercel Subdomains

If you want to allow all Vercel preview deployments:

```typescript
// backend/src/main.ts

app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Allow localhost in development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all Vercel deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow specific production domains
    const allowedDomains = [
      'https://shop.yourdomain.com',
      'https://www.yourdomain.com',
    ];
    
    if (allowedDomains.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
});
```

## Quick Setup Steps

### Step 1: Set Environment Variable

On your server where backend is deployed:

```bash
# Add to .env file
echo "FRONTEND_URL=https://your-vercel-app.vercel.app" >> .env
```

Or set in Docker Compose:

```yaml
# docker-compose.yml
backend:
  environment:
    FRONTEND_URL: https://your-vercel-app.vercel.app
```

### Step 2: Restart Backend

```bash
docker-compose restart backend
```

### Step 3: Test CORS

```bash
# Test from browser console on your Vercel app
fetch('https://your-backend-url.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If you see CORS error, check:
1. `FRONTEND_URL` is set correctly
2. Backend restarted after setting variable
3. URL matches exactly (including https://)

## Common CORS Issues

### Issue 1: CORS Error After Deployment

**Error:**
```
Access to fetch at 'https://api.yourdomain.com/products' from origin 
'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solution:**
```bash
# Set FRONTEND_URL environment variable
export FRONTEND_URL=https://your-app.vercel.app

# Restart backend
docker-compose restart backend
```

### Issue 2: Credentials Not Included

**Error:**
```
The value of the 'Access-Control-Allow-Credentials' header in the response 
is '' which must be 'true' when the request's credentials mode is 'include'
```

**Solution:**
The backend already has `credentials: true` configured. Ensure your frontend requests include credentials:

```typescript
// This is already configured in frontend/src/store/api.ts
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include', // ✅ Already set
});
```

### Issue 3: Preflight Request Fails

**Error:**
```
Response to preflight request doesn't pass access control check
```

**Solution:**
The backend already handles OPTIONS requests. If issue persists:

1. Check if backend is accessible: `curl https://your-backend-url.com/api/health`
2. Check if CORS headers are present: `curl -I https://your-backend-url.com/api/health`
3. Verify SSL certificate is valid (if using HTTPS)

## Testing CORS Configuration

### Test 1: Health Check

```bash
curl -H "Origin: https://your-vercel-app.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-backend-url.com/api/health -v
```

Should return:
```
Access-Control-Allow-Origin: https://your-vercel-app.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

### Test 2: API Request

```bash
curl -H "Origin: https://your-vercel-app.vercel.app" \
     https://your-backend-url.com/api/countries
```

Should return JSON data without CORS errors.

### Test 3: Browser Console

On your Vercel app, open browser console and run:

```javascript
// Test API call
fetch(process.env.NEXT_PUBLIC_API_URL + '/countries')
  .then(r => r.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(err => console.error('❌ CORS error:', err))
```

## Production Checklist

- [ ] `FRONTEND_URL` environment variable set
- [ ] Backend restarted after setting variable
- [ ] CORS test passes (no errors in browser console)
- [ ] API requests work from Vercel app
- [ ] Credentials (cookies) work correctly
- [ ] All HTTP methods work (GET, POST, PUT, DELETE)
- [ ] Preflight requests succeed

## Multiple Environments

If you have multiple environments (dev, staging, production):

```bash
# Development
FRONTEND_URL=http://localhost:3000

# Staging
FRONTEND_URL=https://staging-app.vercel.app

# Production
FRONTEND_URL=https://your-app.vercel.app
```

Or use multiple URLs:

```typescript
// backend/src/main.ts
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV,
  process.env.FRONTEND_URL_STAGING,
  process.env.FRONTEND_URL_PROD,
].filter(Boolean); // Remove undefined values
```

## Security Best Practices

1. **Never use `origin: '*'` in production** - Current config is secure ✅
2. **Always use HTTPS in production** - Vercel provides this automatically ✅
3. **Keep credentials: true** - Required for session-based cart ✅
4. **Limit allowed methods** - Already configured ✅
5. **Validate origin strictly** - Current config does this ✅

## Summary

✅ **Current CORS config is production-ready**  
✅ **Just set `FRONTEND_URL` environment variable**  
✅ **Restart backend after setting variable**  
✅ **Test CORS from browser console**  
✅ **No code changes needed**  

Your backend is ready to accept requests from your Vercel frontend!
