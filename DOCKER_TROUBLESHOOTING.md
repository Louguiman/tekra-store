# Docker Troubleshooting Guide

## Current Issue: Backend Container Unhealthy

### Error Message
```
Container ecommerce_backend Error dependency backend failed to start
dependency failed to start: container ecommerce_backend is unhealthy
Error: ❌ Docker command failed
```

### Root Cause
Docker Desktop is not running on your system.

## Solution Steps

### 1. Start Docker Desktop

**Windows:**
1. Press `Windows Key` and search for "Docker Desktop"
2. Click to launch Docker Desktop
3. Wait for Docker to fully start (whale icon in system tray should be steady, not animated)
4. You should see "Docker Desktop is running" in the system tray

**Alternative - Command Line:**
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### 2. Verify Docker is Running

```powershell
docker --version
docker ps
```

Expected output:
```
Docker version 24.x.x, build xxxxx
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

### 3. Restart Your Application

Once Docker is running:

```powershell
# Stop any existing containers
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

## Common Docker Issues

### Issue 1: "Docker daemon is not running"
**Solution**: Start Docker Desktop application

### Issue 2: "Cannot connect to Docker daemon"
**Solution**: 
1. Restart Docker Desktop
2. Check Windows Services - Docker Desktop Service should be running
3. Run as Administrator if needed

### Issue 3: "Port already in use"
**Solution**:
```powershell
# Find process using port 3001 (backend)
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

### Issue 4: "Container keeps restarting"
**Solution**:
```powershell
# Check container logs
docker-compose logs backend

# Check health status
docker inspect ecommerce_backend | findstr Health

# Common causes:
# - Database not ready
# - Missing environment variables
# - Port conflicts
# - Application errors
```

### Issue 5: "Database connection failed"
**Solution**:
```powershell
# Ensure database container is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify database is healthy
docker-compose exec db pg_isready -U postgres

# If needed, recreate database
docker-compose down -v
docker-compose up -d db
# Wait 10 seconds
docker-compose up -d backend
```

## Health Check Details

The backend container has a health check that verifies:
1. HTTP endpoint `/api/health` responds with 200 OK
2. Database connection is working
3. Application is fully initialized

### View Health Check Status
```powershell
docker inspect ecommerce_backend --format='{{json .State.Health}}' | ConvertFrom-Json
```

### Manual Health Check
```powershell
# If container is running
curl http://localhost:3001/api/health

# Or using PowerShell
Invoke-WebRequest -Uri http://localhost:3001/api/health
```

## Backend-Specific Issues

### Issue: TypeORM Query Errors (FIXED)
✅ **Status**: Fixed in `TYPEORM_QUERY_FIX.md`

The MongoDB-style query syntax has been converted to TypeORM QueryBuilder syntax.

### Issue: Missing Database Tables
**Solution**:
```powershell
# Run migrations
docker-compose exec backend npm run migration:run

# Or use the fix script
.\fix-database.ps1
```

### Issue: Environment Variables Not Loaded
**Solution**:
1. Check `.env` file exists in `backend/` directory
2. Verify all required variables are set:
   ```env
   DATABASE_HOST=db
   DATABASE_PORT=5432
   DATABASE_USER=postgres
   DATABASE_PASSWORD=postgres
   DATABASE_NAME=ecommerce
   JWT_SECRET=your-secret-key
   ```
3. Rebuild container:
   ```powershell
   docker-compose up -d --build backend
   ```

## Complete Reset (Nuclear Option)

If nothing else works:

```powershell
# Stop all containers
docker-compose down

# Remove all volumes (⚠️ This deletes all data!)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a --volumes

# Rebuild everything from scratch
docker-compose up -d --build

# Run migrations
docker-compose exec backend npm run migration:run
```

## Monitoring Commands

### Real-time Logs
```powershell
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Database only
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Status
```powershell
# List all containers
docker-compose ps

# Detailed container info
docker inspect ecommerce_backend

# Resource usage
docker stats
```

### Database Access
```powershell
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d ecommerce

# List tables
docker-compose exec db psql -U postgres -d ecommerce -c "\dt"

# Check specific table
docker-compose exec db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;"
```

## Performance Issues

### Issue: Slow Container Startup
**Solutions**:
1. Increase Docker Desktop resources:
   - Settings → Resources → Advanced
   - Increase CPUs to 4+
   - Increase Memory to 8GB+
2. Use WSL 2 backend (faster on Windows)
3. Exclude project folder from antivirus scanning

### Issue: High CPU/Memory Usage
**Solutions**:
1. Check for infinite loops in logs
2. Reduce scheduled task frequency
3. Optimize database queries
4. Add resource limits in docker-compose.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

## Prevention

### Best Practices
1. Always start Docker Desktop before running docker-compose commands
2. Use `docker-compose down` before shutting down your computer
3. Regularly clean up unused containers/images:
   ```powershell
   docker system prune
   ```
4. Keep Docker Desktop updated
5. Monitor disk space (Docker can use a lot)

### Automated Startup
Create a startup script `start-dev.ps1`:
```powershell
# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    # Wait for Docker to start
    $timeout = 60
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        $dockerRunning = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker is ready!"
            break
        }
    }
}

# Start application
docker-compose up -d
docker-compose logs -f
```

## Getting Help

### Collect Diagnostic Information
```powershell
# System info
docker version
docker-compose version
docker info

# Container logs
docker-compose logs > docker-logs.txt

# Container status
docker-compose ps > docker-status.txt

# Health check
docker inspect ecommerce_backend > backend-inspect.txt
```

### Useful Resources
- [Docker Desktop Documentation](https://docs.docker.com/desktop/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [TypeORM Documentation](https://typeorm.io/)

---

## Quick Reference

### Start Everything
```powershell
docker-compose up -d
```

### Stop Everything
```powershell
docker-compose down
```

### Rebuild Backend
```powershell
docker-compose up -d --build backend
```

### View Logs
```powershell
docker-compose logs -f backend
```

### Run Migrations
```powershell
docker-compose exec backend npm run migration:run
```

### Access Database
```powershell
docker-compose exec db psql -U postgres -d ecommerce
```

### Check Health
```powershell
curl http://localhost:3001/api/health
```

---

**Last Updated**: February 5, 2026  
**Status**: Docker Desktop not running - Start Docker Desktop to resolve
