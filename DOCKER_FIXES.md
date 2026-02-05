# Docker Compose Fixes

## Issues Fixed

### 1. Frontend Health Check (404 Error)
**Problem**: Health check was looking for `/health.json` which returns 404 in Next.js production build.

**Solution**: Changed health check to test the root path `/` instead:
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1"]
```

### 2. Backend API Requests Blocked (CORS/Network Issue)
**Problem**: Frontend couldn't reach backend due to:
- Incorrect API URL (using `localhost` instead of Docker service name)
- Missing nginx proxy for proper routing
- CORS issues

**Solutions**:

#### A. Use Nginx as Reverse Proxy (Recommended)
The nginx service is now configured to:
- Route `/api/*` requests to the backend service
- Route all other requests to the frontend service
- Handle CORS properly
- Provide rate limiting and security headers

**Access the application**:
- Main app: `http://localhost` (port 80)
- Direct frontend: `http://localhost:3002` (port 3002)
- Direct backend: `http://localhost:3001` (port 3001)

**Frontend environment variables**:
```env
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_URL=http://localhost
```

**Note**: The frontend is now configured to use the nginx proxy by default. All API requests from the browser will go through `http://localhost/api` which nginx routes to the backend service.

#### B. Direct Service Communication (Alternative)
If not using nginx, update frontend to use Docker service names:
```yaml
environment:
  NEXT_PUBLIC_API_URL: http://backend:3001
```

**Note**: This only works for server-side requests. Client-side requests from the browser still need to use `localhost` or a proxy.

## Recommended Setup

### Development
Use the current setup with nginx:
```bash
docker-compose up -d
```

Access at: `http://localhost`

### Production
1. Update `.env` file:
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

2. Configure SSL in nginx (uncomment HTTPS server block)

3. Deploy with:
```bash
docker-compose up -d
```

## Testing

### Check Health
```bash
# Nginx health
curl http://localhost/health

# Backend health
curl http://localhost:3001/api/health

# Frontend (should return HTML)
curl http://localhost:3002/
```

### Check API Access
```bash
# Through nginx proxy
curl http://localhost/api/health

# Direct to backend
curl http://localhost:3001/api/health
```

### Check Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx
```

## Troubleshooting

### Frontend still getting 404
1. Check if Next.js is running: `docker-compose logs frontend`
2. Verify the build completed: `docker-compose exec frontend ls -la`
3. Try rebuilding: `docker-compose up --build frontend`

### API requests still blocked
1. Check nginx is running: `docker-compose ps nginx`
2. Verify nginx config: `docker-compose exec nginx nginx -t`
3. Check backend is healthy: `curl http://localhost:3001/api/health`
4. Review nginx logs: `docker-compose logs nginx`

### CORS errors
1. Verify `FRONTEND_URL` in backend environment matches your frontend URL
2. Check nginx is properly proxying requests
3. Ensure you're accessing through nginx (port 80) not directly

## Environment Variables Summary

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost
JWT_SECRET=your-secret-key
# ... other vars
```

### Frontend (.env.local or docker-compose)
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_URL=http://localhost
```

### Docker Compose (.env)
```env
POSTGRES_DB=ecommerce_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
NGINX_PORT=80
FRONTEND_PORT=3002
BACKEND_PORT=3001
```
