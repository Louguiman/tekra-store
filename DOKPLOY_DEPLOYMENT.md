# Dokploy Deployment Guide - UPDATED

## Issue Resolution for Docker Build Failures

The error "failed to read dockerfile: open Dockerfile: no such file or directory" indicates Dokploy is having issues with Docker builds. Here are multiple solutions in order of preference.

## Solution 1: Use No-Build Compose (RECOMMENDED)

This completely avoids Docker build issues by using base Node.js images:

```bash
docker-compose -f docker-compose.no-build.yml up -d
```

This approach:
- Uses `node:18-alpine` base images directly
- Installs dependencies at runtime
- Avoids all Dockerfile-related issues
- Should work with any Docker platform

## Solution 2: Use Simplified Dockerfiles

The main Dockerfiles have been updated to single-stage builds. Try:

```bash
docker-compose up -d
```

## Solution 3: Use Minimal Volume-Based Approach

```bash
docker-compose -f docker-compose.minimal.yml up -d
```

## Solution 4: Manual Container Deployment

If all docker-compose methods fail, deploy containers individually:

```bash
# 1. Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=ecommerce_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Start Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

# 3. Start Backend
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
  -v $(pwd)/backend:/app \
  -w /app \
  node:18-alpine \
  sh -c "apk add --no-cache curl && npm install && npm run build && node dist/main"

# 4. Start Frontend
docker run -d --name frontend \
  --link backend:backend \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001/api \
  -p 3000:3000 \
  -v $(pwd)/frontend:/app \
  -w /app \
  node:18-alpine \
  sh -c "apk add --no-cache curl && npm install && npm run build && npm start"
```

## Solution 5: Pre-built Images

Build images locally and push to a registry:

```bash
# Build locally
docker build -t your-registry/westtech-backend ./backend
docker build -t your-registry/westtech-frontend ./frontend

# Push to registry
docker push your-registry/westtech-backend
docker push your-registry/westtech-frontend

# Create docker-compose.images.yml
cat > docker-compose.images.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecommerce_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    image: your-registry/westtech-backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: password
      DB_NAME: ecommerce_db
      JWT_SECRET: your-secret
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  frontend:
    image: your-registry/westtech-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
EOF

# Deploy with pre-built images
docker-compose -f docker-compose.images.yml up -d
```

## Dokploy-Specific Configuration

### Environment Variables for Dokploy

Set these in your Dokploy environment:

```env
NODE_ENV=production
POSTGRES_DB=ecommerce_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Dokploy Project Setup

1. **Repository**: Point to your Git repository
2. **Build Command**: Leave empty (we're avoiding builds)
3. **Docker Compose File**: Use `docker-compose.no-build.yml`
4. **Environment Variables**: Set the variables above

## Troubleshooting Steps

### Step 1: Test Locally First

```bash
# Test the no-build approach locally
docker-compose -f docker-compose.no-build.yml up -d

# Check if services start
docker-compose -f docker-compose.no-build.yml ps

# Check logs if there are issues
docker-compose -f docker-compose.no-build.yml logs
```

### Step 2: Verify File Structure

Ensure your repository has this structure:
```
├── backend/
│   ├── package.json
│   ├── src/
│   └── ...
├── frontend/
│   ├── package.json
│   ├── src/
│   └── ...
├── docker-compose.no-build.yml
└── docker-compose.yml
```

### Step 3: Check Dokploy Logs

In Dokploy:
1. Go to your project
2. Check the deployment logs
3. Look for specific error messages

### Step 4: Alternative Platforms

If Dokploy continues to have issues, consider these alternatives:
- **Railway**: Excellent for Node.js apps
- **Render**: Good Docker support
- **DigitalOcean App Platform**: Simple deployment
- **Heroku**: Classic PaaS option
- **Vercel** (frontend) + **Railway** (backend): Split deployment

## Success Verification

After deployment, test these endpoints:

```bash
# Database connection
curl http://your-domain:3001/api/health

# Frontend
curl http://your-domain:3000

# API functionality
curl http://your-domain:3001/api/countries
```

## Production Checklist

- [ ] Change default passwords
- [ ] Set secure JWT secret
- [ ] Configure domain URLs
- [ ] Set up SSL certificates
- [ ] Configure environment variables
- [ ] Test all endpoints
- [ ] Set up monitoring
- [ ] Configure backups

## Support

If all solutions fail:

1. **Check Dokploy Documentation**: Look for known issues
2. **Dokploy Community**: Ask in their Discord/forums
3. **Alternative Deployment**: Consider other platforms
4. **Local Development**: Use `docker-compose.no-build.yml` locally

The `docker-compose.no-build.yml` approach should work on any Docker platform, including Dokploy, as it avoids all Dockerfile-related issues.