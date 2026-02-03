# Dokploy Deployment Guide

## Issue Resolution for Docker Build Failures

The error "failed to read dockerfile: open Dockerfile: no such file or directory" typically occurs when Dokploy has issues with the build context or multi-stage builds.

## Solution Options

### Option 1: Use Simple Docker Compose (Recommended)

Use the simplified docker-compose file that avoids complex multi-stage builds:

```bash
# Use the simple docker-compose file
docker-compose -f docker-compose.simple.yml up -d
```

### Option 2: Use Simple Dockerfiles

If Dokploy still has issues, use the simple Dockerfiles:

1. **Backend**: Use `backend/Dockerfile.simple`
2. **Frontend**: Use `frontend/Dockerfile.simple`

Update your docker-compose.yml to reference these:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.simple

frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.simple
```

### Option 3: Manual Build and Push

If Dokploy continues to have issues, build and push images manually:

```bash
# Build backend image
cd backend
docker build -f Dockerfile.simple -t westtech-backend .

# Build frontend image  
cd ../frontend
docker build -f Dockerfile.simple -t westtech-frontend .

# Tag and push to your registry
docker tag westtech-backend your-registry/westtech-backend:latest
docker tag westtech-frontend your-registry/westtech-frontend:latest

docker push your-registry/westtech-backend:latest
docker push your-registry/westtech-frontend:latest
```

Then update docker-compose.yml to use the pushed images:

```yaml
backend:
  image: your-registry/westtech-backend:latest

frontend:
  image: your-registry/westtech-frontend:latest
```

## Dokploy-Specific Configuration

### Environment Variables

Set these environment variables in Dokploy:

```env
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
POSTGRES_DB=ecommerce_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Port Configuration

Ensure these ports are properly configured in Dokploy:
- Frontend: 3000
- Backend: 3001
- PostgreSQL: 5432
- Redis: 6379

### Volume Mounts

Configure these volumes in Dokploy:
- `postgres_data` for database persistence
- `redis_data` for Redis persistence  
- `backend_uploads` for file uploads

## Troubleshooting Steps

1. **Check Build Context**: Ensure Dokploy is using the correct repository root as build context

2. **Verify Dockerfile Paths**: Confirm that Dockerfiles exist in the correct locations:
   - `backend/Dockerfile` or `backend/Dockerfile.simple`
   - `frontend/Dockerfile` or `frontend/Dockerfile.simple`

3. **Check Dependencies**: Ensure all package.json files are present and valid

4. **Build Locally First**: Test the build process locally before deploying:
   ```bash
   docker-compose -f docker-compose.simple.yml build
   docker-compose -f docker-compose.simple.yml up -d
   ```

5. **Check Logs**: Review Dokploy build logs for specific error messages

6. **Use Health Checks**: Enable health checks to ensure services start properly

## Alternative: Direct Docker Commands

If docker-compose continues to fail, deploy services individually:

```bash
# Start database first
docker run -d --name postgres \
  -e POSTGRES_DB=ecommerce_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Build and start backend
cd backend
docker build -f Dockerfile.simple -t westtech-backend .
docker run -d --name backend \
  --link postgres:postgres \
  --link redis:redis \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e DB_NAME=ecommerce_db \
  -e JWT_SECRET=your-secret \
  -p 3001:3001 \
  westtech-backend

# Build and start frontend
cd ../frontend
docker build -f Dockerfile.simple -t westtech-frontend .
docker run -d --name frontend \
  --link backend:backend \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001/api \
  -p 3000:3000 \
  westtech-frontend
```

## Success Verification

After deployment, verify the services:

1. **Database**: `docker exec -it postgres psql -U postgres -d ecommerce_db -c "SELECT 1;"`
2. **Backend**: `curl http://localhost:3001/api/health`
3. **Frontend**: `curl http://localhost:3000`

## Production Considerations

1. **Security**: Change default passwords and JWT secrets
2. **SSL**: Configure HTTPS with proper certificates
3. **Monitoring**: Set up logging and monitoring
4. **Backups**: Configure database backups
5. **Scaling**: Consider horizontal scaling for high traffic

## Support

If issues persist:
1. Check Dokploy documentation
2. Review Docker and docker-compose logs
3. Test locally before deploying
4. Consider using a different deployment platform if Dokploy continues to have issues