# Quick Start Guide

## Docker Deployment

### 1. Stop and Remove Existing Containers
```bash
docker-compose down
```

### 2. Rebuild and Start Services
```bash
docker-compose up --build -d
```

### 3. Check Service Status
```bash
docker-compose ps
```

All services should show as "healthy" after a minute or two.

### 4. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 5. Test the Application

#### Access Points
- **Main Application**: http://localhost (through nginx proxy)
- **Frontend Direct**: http://localhost:3002
- **Backend Direct**: http://localhost:3001

#### Health Checks
```bash
# Nginx health
curl http://localhost/health

# Backend API health
curl http://localhost/api/health

# Backend direct
curl http://localhost:3001/api/health

# Frontend (should return HTML)
curl http://localhost:3002/
```

### 6. Test API Connectivity
Open your browser and navigate to:
- http://localhost - Main application
- Open browser DevTools (F12) → Network tab
- Navigate through the app and verify API calls are going to `http://localhost/api/*`
- Check that responses are successful (200 status codes)

## Troubleshooting

### Services Not Starting
```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend

# Verify database is ready
docker-compose logs postgres
```

### API Requests Failing
```bash
# Check nginx is routing correctly
docker-compose logs nginx

# Test backend directly
curl http://localhost:3001/api/health

# Test through nginx proxy
curl http://localhost/api/health
```

### Frontend Build Issues
```bash
# Rebuild frontend only
docker-compose up --build frontend

# Check frontend logs
docker-compose logs -f frontend
```

### Database Connection Issues
```bash
# Check postgres is healthy
docker-compose ps postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d ecommerce_db
```

## Environment Variables

The application uses these key environment variables:

### Frontend (in docker-compose.yml)
- `NEXT_PUBLIC_API_URL=http://localhost/api` - API endpoint (through nginx)
- `NEXT_PUBLIC_APP_URL=http://localhost` - Application URL

### Backend (in docker-compose.yml)
- `DB_HOST=postgres` - Database host (Docker service name)
- `FRONTEND_URL=http://localhost` - Frontend URL for CORS
- `PORT=3001` - Backend port

### Nginx
- `NGINX_PORT=80` - External port for nginx

## Common Commands

```bash
# Stop all services
docker-compose down

# Start services
docker-compose up -d

# Restart a specific service
docker-compose restart frontend

# View service logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec backend npm run migration:run

# Remove all containers and volumes (CAUTION: deletes data)
docker-compose down -v
```

## Production Deployment

For production, update your `.env` file:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-secure-random-secret
POSTGRES_PASSWORD=your-secure-password
```

Then configure SSL in nginx and deploy.
