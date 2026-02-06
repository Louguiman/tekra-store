# Docker Network Architecture

## Overview

The application now uses **internal Docker networking** for communication between containers, which is more efficient and follows Docker best practices.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                              │
│  Accesses: http://localhost:3002                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Container (Next.js)                    │
│              Port: 3000 (internal) → 3002 (host)            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Client-Side Code                                     │  │
│  │  - Fetches from /api/products/*                      │  │
│  │  - Runs in browser                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js API Routes (Proxy)                          │  │
│  │  - /api/products/featured                            │  │
│  │  - /api/products/trending                            │  │
│  │  - /api/products/deals                               │  │
│  │  - /api/products/new-arrivals                        │  │
│  │                                                       │  │
│  │  Uses: API_URL=http://backend:3001/api              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Internal Docker Network
                         │ (ecommerce_network)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Container (NestJS)                      │
│              Port: 3001 (internal) → 3001 (host)            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints                                   │  │
│  │  - GET /api/products/featured                        │  │
│  │  - GET /api/products/trending                        │  │
│  │  - GET /api/products/deals                           │  │
│  │  - GET /api/products/new-arrivals                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Container                            │
│              Port: 5432 (internal) → 5432 (host)            │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Client-Side Request Flow

```
Browser → Frontend Container (localhost:3002)
       → Next.js API Route (/api/products/featured)
       → Backend Container (http://backend:3001/api)
       → PostgreSQL Container
       ← Response flows back
```

### 2. Key Components

#### A. Next.js API Routes (Proxy Layer)

Located in `frontend/src/app/api/products/*/route.ts`

These routes act as a **proxy** between the browser and the backend:
- Run on the **server-side** (inside frontend container)
- Use **internal Docker network** to communicate with backend
- Use `API_URL=http://backend:3001/api` (container name)
- No CORS issues since requests come from server

**Benefits:**
- ✅ Uses internal Docker network (faster, more secure)
- ✅ No CORS issues
- ✅ Can add caching, rate limiting, authentication
- ✅ Hides backend URL from client
- ✅ Can transform/validate data before sending to client

#### B. API Client Library

Located in `frontend/src/lib/api-client.ts`

Provides a unified API client that works in both contexts:
- **Server-side**: Uses `API_URL` (internal network)
- **Client-side**: Uses `NEXT_PUBLIC_API_URL` (localhost)

#### C. Environment Variables

**Frontend Container:**
```env
# Server-side (internal Docker network)
API_URL=http://backend:3001/api

# Client-side (browser accessible)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

**Backend Container:**
```env
PORT=3001
DB_HOST=postgres  # Uses container name
DB_PORT=5432
```

### 3. Network Configuration

**Docker Compose Network:**
```yaml
networks:
  ecommerce_network:
    driver: bridge
```

All containers are on the same network and can communicate using **container names** as hostnames:
- `backend` → Backend container
- `postgres` → Database container
- `redis` → Redis container
- `frontend` → Frontend container

### 4. Port Mapping

```yaml
backend:
  ports:
    - "3001:3001"  # Host:Container
  # Accessible as:
  # - http://backend:3001 (from other containers)
  # - http://localhost:3001 (from host machine)

frontend:
  ports:
    - "3002:3000"  # Host:Container
  # Accessible as:
  # - http://frontend:3000 (from other containers)
  # - http://localhost:3002 (from host machine)
```

## Implementation Details

### Created Files

1. **`frontend/src/lib/api-client.ts`**
   - Unified API client for server and client contexts
   - Automatically uses correct URL based on execution environment

2. **`frontend/src/app/api/products/featured/route.ts`**
   - Proxy for featured products endpoint
   - Uses internal Docker network

3. **`frontend/src/app/api/products/trending/route.ts`**
   - Proxy for trending products endpoint

4. **`frontend/src/app/api/products/deals/route.ts`**
   - Proxy for deals endpoint

5. **`frontend/src/app/api/products/new-arrivals/route.ts`**
   - Proxy for new arrivals endpoint

### Modified Files

1. **`docker-compose.yml`**
   - Added `API_URL` environment variable for frontend
   - Keeps `NEXT_PUBLIC_API_URL` for direct client access if needed

2. **`frontend/src/app/page.tsx`**
   - Changed to use `/api/products/*` instead of direct backend calls
   - Now uses Next.js API routes as proxy

3. **`frontend/.env`** and **`frontend/.env.example`**
   - Added `API_URL` for server-side requests
   - Kept `NEXT_PUBLIC_API_URL` for client-side requests

## Benefits of This Architecture

### 1. Performance
- ✅ Internal Docker network is faster than localhost
- ✅ No need to go through host network stack
- ✅ Reduced latency

### 2. Security
- ✅ Backend URL not exposed to client
- ✅ Can add authentication/authorization in proxy layer
- ✅ Can validate/sanitize requests before forwarding
- ✅ No CORS issues

### 3. Flexibility
- ✅ Can add caching in proxy layer
- ✅ Can add rate limiting
- ✅ Can transform data before sending to client
- ✅ Can aggregate multiple backend calls into one endpoint

### 4. Scalability
- ✅ Easy to add load balancing
- ✅ Can scale frontend and backend independently
- ✅ Can add API gateway later

### 5. Development
- ✅ Works the same in development and production
- ✅ No need to change URLs between environments
- ✅ Easy to test

## How to Deploy

### 1. Rebuild Frontend

The frontend needs to be rebuilt to include the new API routes:

```powershell
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### 2. Verify

Check that containers can communicate:

```powershell
# Check if frontend can reach backend
docker exec ecommerce_frontend wget -O- http://backend:3001/api/health

# Should return: {"status":"ok"}
```

### 3. Test

Open http://localhost:3002 in browser and check:
- Homepage loads products
- No console errors
- Network tab shows requests to `/api/products/*` (not `localhost:3001`)

## Troubleshooting

### Issue: Frontend can't reach backend

**Check network:**
```powershell
docker network inspect ecommerce_network
```

Both containers should be listed.

**Check DNS resolution:**
```powershell
docker exec ecommerce_frontend ping -c 3 backend
```

Should resolve to backend container IP.

### Issue: API routes return 500 error

**Check backend logs:**
```powershell
docker logs ecommerce_backend --tail 50
```

**Check frontend logs:**
```powershell
docker logs ecommerce_frontend --tail 50
```

### Issue: Environment variables not set

**Check frontend environment:**
```powershell
docker exec ecommerce_frontend env | grep API_URL
```

Should show:
```
API_URL=http://backend:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Migration from Old Architecture

### Old Architecture (Direct Backend Calls)
```typescript
// Client-side code directly calling backend
fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/featured`)
// Goes: Browser → localhost:3001 → Backend Container
```

### New Architecture (Proxy Pattern)
```typescript
// Client-side code calling Next.js API route
fetch('/api/products/featured')
// Goes: Browser → Frontend Container → Backend Container (internal network)
```

## Future Enhancements

### 1. Add Caching
```typescript
// In API route
export async function GET(request: NextRequest) {
  // Check cache first
  const cached = await redis.get('products:featured');
  if (cached) return NextResponse.json(JSON.parse(cached));
  
  // Fetch from backend
  const data = await fetch(`${API_URL}/products/featured`);
  
  // Cache for 5 minutes
  await redis.setex('products:featured', 300, JSON.stringify(data));
  
  return NextResponse.json(data);
}
```

### 2. Add Rate Limiting
```typescript
// In API route
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = request.ip || 'unknown';
  
  if (!await rateLimit.check(ip, 100, 60)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // Continue with request...
}
```

### 3. Add Request Transformation
```typescript
// In API route
export async function GET(request: NextRequest) {
  const data = await fetch(`${API_URL}/products/featured`);
  
  // Transform data before sending to client
  const transformed = data.map(product => ({
    ...product,
    imageUrl: `${CDN_URL}${product.imageUrl}`,
    price: formatPrice(product.price),
  }));
  
  return NextResponse.json(transformed);
}
```

## Summary

The application now uses a **proxy pattern** with Next.js API routes to leverage the internal Docker network for container-to-container communication. This provides better performance, security, and flexibility while maintaining a clean separation of concerns.

**Key Changes:**
- ✅ Frontend uses Next.js API routes as proxy
- ✅ API routes use internal Docker network (`http://backend:3001/api`)
- ✅ Browser requests go to `/api/products/*` (same origin, no CORS)
- ✅ More efficient, secure, and scalable architecture
