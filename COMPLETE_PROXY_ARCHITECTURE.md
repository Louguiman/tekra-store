# Complete Proxy Architecture - All API Requests

## Overview

All API requests from the frontend now go through Next.js API routes (proxy layer) which use the internal Docker network to communicate with the backend. This provides better performance, security, and flexibility.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Client)                             │
│                                                                  │
│  - React Components                                             │
│  - Redux Store                                                  │
│  - RTK Query Hooks                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ All requests go to /api/*
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Container (Next.js)                        │
│              Port: 3000 (internal) → 3002 (host)                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js API Routes (Proxy Layer)                        │  │
│  │                                                           │  │
│  │  1. Specific Routes:                                     │  │
│  │     /api/products/featured                               │  │
│  │     /api/products/trending                               │  │
│  │     /api/products/deals                                  │  │
│  │     /api/products/new-arrivals                           │  │
│  │                                                           │  │
│  │  2. Catch-All Route:                                     │  │
│  │     /api/backend/[...path]                               │  │
│  │     → Proxies ALL other API requests                     │  │
│  │     → Handles GET, POST, PUT, PATCH, DELETE              │  │
│  │     → Forwards headers, cookies, body                    │  │
│  │                                                           │  │
│  │  Uses: API_URL=http://backend:3001/api                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Internal Docker Network
                         │ (ecommerce_network)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend Container (NestJS)                          │
│              Port: 3001 (internal) → 3001 (host)                │
│                                                                  │
│  REST API Endpoints                                             │
│  - /api/products/*                                              │
│  - /api/orders/*                                                │
│  - /api/cart/*                                                  │
│  - /api/auth/*                                                  │
│  - /api/admin/*                                                 │
│  - etc.                                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow Examples

### Example 1: Homepage Loading Products

```
1. Browser → fetch('/api/products/featured')
2. Next.js → /api/products/featured/route.ts
3. Proxy → http://backend:3001/api/products/featured
4. Backend → Returns product data
5. Proxy → Returns to browser
```

### Example 2: Redux RTK Query (Cart, Orders, etc.)

```
1. Browser → useGetCartQuery()
2. Redux → fetch('/api/backend/cart')
3. Next.js → /api/backend/[...path]/route.ts
4. Proxy → http://backend:3001/api/cart
5. Backend → Returns cart data
6. Proxy → Returns to Redux
7. Redux → Updates store
```

### Example 3: Admin Login

```
1. Browser → useAdminLoginMutation({ email, password })
2. Redux → POST /api/backend/auth/admin/login
3. Next.js → /api/backend/[...path]/route.ts
4. Proxy → POST http://backend:3001/api/auth/admin/login
5. Backend → Validates credentials, returns token
6. Proxy → Forwards response with Set-Cookie header
7. Redux → Stores token in localStorage
```

## Implementation Details

### 1. Redux API Slice Configuration

**File:** `frontend/src/store/api.ts`

```typescript
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/backend', // Proxy through Next.js
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
```

**What changed:**
- ❌ Before: `baseUrl: process.env.NEXT_PUBLIC_API_URL` (direct backend call)
- ✅ After: `baseUrl: '/api/backend'` (proxy through Next.js)

### 2. Catch-All Proxy Route

**File:** `frontend/src/app/api/backend/[...path]/route.ts`

This route handles ALL API requests from Redux:

**Features:**
- ✅ Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- ✅ Forwards authorization headers
- ✅ Forwards cookies for session-based auth
- ✅ Forwards request body for POST/PUT/PATCH
- ✅ Preserves query parameters
- ✅ Returns same status codes and headers
- ✅ Handles errors gracefully

**Example mappings:**
```
/api/backend/products → http://backend:3001/api/products
/api/backend/cart → http://backend:3001/api/cart
/api/backend/orders/123 → http://backend:3001/api/orders/123
/api/backend/auth/admin/login → http://backend:3001/api/auth/admin/login
```

### 3. Specific Product Routes

**Files:**
- `frontend/src/app/api/products/featured/route.ts`
- `frontend/src/app/api/products/trending/route.ts`
- `frontend/src/app/api/products/deals/route.ts`
- `frontend/src/app/api/products/new-arrivals/route.ts`

These are used by the homepage for direct fetching (not through Redux).

### 4. Homepage Implementation

**File:** `frontend/src/app/page.tsx`

```typescript
const fetchHomePageData = async () => {
  const [featured, trending, deals, arrivals] = await Promise.all([
    fetch('/api/products/featured?limit=8').then(r => r.json()),
    fetch('/api/products/trending?limit=8').then(r => r.json()),
    fetch('/api/products/deals?limit=8').then(r => r.json()),
    fetch('/api/products/new-arrivals?limit=8').then(r => r.json()),
  ]);
  // ...
};
```

## Benefits

### 1. Performance
- ✅ **Internal Docker network**: Faster than localhost
- ✅ **No external network hops**: Direct container-to-container
- ✅ **Reduced latency**: No host network stack overhead

### 2. Security
- ✅ **Backend URL hidden**: Client doesn't know backend location
- ✅ **No CORS issues**: Same-origin requests
- ✅ **Centralized auth**: Can validate tokens in proxy
- ✅ **Request validation**: Can sanitize/validate before forwarding

### 3. Flexibility
- ✅ **Caching layer**: Can add Redis caching in proxy
- ✅ **Rate limiting**: Can limit requests per IP
- ✅ **Request transformation**: Can modify requests/responses
- ✅ **Logging**: Centralized request logging
- ✅ **A/B testing**: Can route to different backends

### 4. Maintainability
- ✅ **Single configuration**: One place to change backend URL
- ✅ **Easy debugging**: All requests go through proxy
- ✅ **Consistent error handling**: Centralized error responses
- ✅ **Type safety**: TypeScript throughout

## Environment Variables

### Frontend Container

```env
# Server-side (internal Docker network)
API_URL=http://backend:3001/api

# Client-side (browser accessible - kept for backward compatibility)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Backend Container

```env
PORT=3001
DB_HOST=postgres
DB_PORT=5432
# ... other backend env vars
```

## All API Endpoints Covered

### Public Endpoints (No Auth)
- ✅ `/products/*` - Product listings, details, search
- ✅ `/categories` - Category listings
- ✅ `/countries` - Country configurations
- ✅ `/delivery/*` - Delivery methods, tracking
- ✅ `/health` - Health check

### Protected Endpoints (Auth Required)
- ✅ `/cart/*` - Cart operations
- ✅ `/orders/*` - Order management
- ✅ `/payments/*` - Payment processing
- ✅ `/auth/*` - Authentication

### Admin Endpoints (Admin Auth Required)
- ✅ `/admin/users/*` - User management
- ✅ `/admin/products/*` - Product management
- ✅ `/admin/orders/*` - Order management
- ✅ `/admin/inventory/*` - Inventory management
- ✅ `/admin/validations/*` - Validation queue
- ✅ `/admin/dashboard/*` - Analytics
- ✅ `/admin/suppliers/*` - Supplier management

## Testing

### 1. Test Proxy Route

```powershell
# From host machine
curl http://localhost:3002/api/backend/health
```

Should return: `{"status":"ok"}`

### 2. Test Redux API

Open browser console:
```javascript
// Check Redux store
window.__REDUX_DEVTOOLS_EXTENSION__?.()

// Make a test request
fetch('/api/backend/products?limit=5')
  .then(r => r.json())
  .then(console.log)
```

### 3. Test Internal Network

```powershell
# From frontend container
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health
```

Should return: `{"status":"ok"}`

### 4. Check Network Tab

1. Open http://localhost:3002
2. Open DevTools (F12)
3. Go to Network tab
4. Refresh page
5. All requests should go to `/api/*` (not `localhost:3001`)

## Deployment

### Quick Deploy

```powershell
.\fix-and-restart.ps1
```

### Manual Deploy

```powershell
# 1. Stop containers
docker-compose down

# 2. Rebuild (no cache)
docker-compose build --no-cache

# 3. Start containers
docker-compose up -d

# 4. Wait for services
Start-Sleep -Seconds 40

# 5. Test
curl http://localhost:3002/api/backend/health
```

## Troubleshooting

### Issue: 404 on /api/backend/*

**Cause:** Catch-all route not working

**Solution:**
```powershell
# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d
```

### Issue: 500 Internal Server Error

**Check proxy logs:**
```powershell
docker logs ecommerce_frontend --tail 50 | grep "Proxy error"
```

**Check backend logs:**
```powershell
docker logs ecommerce_backend --tail 50
```

### Issue: Authentication not working

**Check headers:**
```javascript
// In browser console
fetch('/api/backend/auth/admin/validate', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  }
}).then(r => r.json()).then(console.log)
```

### Issue: CORS errors

**Should not happen** with proxy architecture. If you see CORS errors:
1. Clear browser cache
2. Hard refresh (Ctrl + Shift + R)
3. Check that requests go to `/api/*` not `localhost:3001`

## Migration Checklist

- [x] Updated Redux API slice to use `/api/backend`
- [x] Created catch-all proxy route
- [x] Created specific product routes
- [x] Updated homepage to use proxy routes
- [x] Updated docker-compose.yml with API_URL
- [x] Updated environment files
- [x] Tested all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- [x] Tested authentication flow
- [x] Tested admin endpoints
- [x] Tested public endpoints
- [x] Documented architecture

## Future Enhancements

### 1. Add Redis Caching

```typescript
// In proxy route
const cached = await redis.get(`api:${path}`);
if (cached) return NextResponse.json(JSON.parse(cached));

const response = await fetch(backendUrl);
await redis.setex(`api:${path}`, 300, JSON.stringify(response));
```

### 2. Add Rate Limiting

```typescript
// In proxy route
const ip = request.ip || 'unknown';
const key = `ratelimit:${ip}`;
const count = await redis.incr(key);

if (count === 1) await redis.expire(key, 60);
if (count > 100) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

### 3. Add Request Logging

```typescript
// In proxy route
console.log({
  timestamp: new Date().toISOString(),
  method,
  path,
  ip: request.ip,
  userAgent: request.headers.get('user-agent'),
  duration: Date.now() - startTime,
});
```

### 4. Add Response Transformation

```typescript
// In proxy route
const data = await response.json();

// Transform data before sending to client
const transformed = {
  ...data,
  _cached: false,
  _timestamp: Date.now(),
};

return NextResponse.json(transformed);
```

## Summary

✅ **Complete**: All API requests now go through Next.js proxy
✅ **Redux**: Updated to use `/api/backend` base URL
✅ **Catch-all**: Handles all HTTP methods and endpoints
✅ **Specific routes**: Homepage products use dedicated routes
✅ **Internal network**: All proxy requests use Docker network
✅ **Performance**: Faster, more secure, more flexible
✅ **Tested**: All endpoints verified working

The entire application now uses a unified proxy architecture for all backend communication, leveraging the internal Docker network for optimal performance and security.
