# Port 80 Conflict Fix

## Issue
```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

Nginx container cannot start because port 80 is already in use by another service on your system.

## Common Causes on Windows

1. **IIS (Internet Information Services)** - Windows built-in web server
2. **Apache** - If you have XAMPP, WAMP, or standalone Apache
3. **Skype** - Older versions use port 80
4. **SQL Server Reporting Services**
5. **Other Docker containers**
6. **Windows Web Deployment Agent Service**

## Solution Applied

Changed nginx to use port **3002** instead of port 80:

```yaml
nginx:
  ports:
    - "${NGINX_PORT:-3002}:80"  # Changed from 80:80
```

## Access URLs

### Before (Port 80):
```
http://localhost
```

### After (Port 3002):
```
http://localhost:3002
```

### Service Architecture:
```
Nginx (Port 3002) → Routes to:
  - Frontend (Internal Port 3000)
  - Backend API (Internal Port 3001)
```

### Direct Service Access (if needed):
```
Frontend: http://localhost:3000 (internal)
Backend:  http://localhost:3001 (direct access)
```

## Alternative Solutions

### Option 1: Stop the Service Using Port 80

#### Find what's using port 80:
```powershell
# PowerShell
Get-NetTCPConnection -LocalPort 80 | Select-Object OwningProcess, State
Get-Process -Id <PID>

# Or using netstat
netstat -ano | findstr :80
```

#### Stop IIS (if that's the culprit):
```powershell
# Stop IIS
iisreset /stop

# Or disable IIS service
Stop-Service W3SVC
Set-Service W3SVC -StartupType Disabled
```

#### Stop Apache (XAMPP/WAMP):
```powershell
# Stop Apache service
net stop Apache2.4

# Or use XAMPP/WAMP control panel
```

### Option 2: Use a Different Port (Recommended)

Set custom port in `.env` file:
```env
NGINX_PORT=8080
```

Or use any other available port:
```env
NGINX_PORT=8000
NGINX_PORT=8888
NGINX_PORT=9000
```

### Option 3: Remove Nginx (Development Only)

For development, you can access services directly without nginx:

```yaml
# Comment out nginx service in docker-compose.yml
# nginx:
#   image: nginx:alpine
#   ...
```

Then access:
- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:3001/api`

## Testing

### Check if port is free:
```powershell
# Should return nothing if port is free
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

### Start services:
```bash
docker-compose up -d
```

### Verify nginx is running:
```bash
docker-compose ps nginx
curl http://localhost:8080
```

## Update Frontend Configuration

If using port 8080, update frontend environment:

```env
# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_URL=http://localhost:8080
```

## Nginx Configuration

The nginx.conf routes requests:
- `/` → Frontend (port 3000)
- `/api` → Backend (port 3001)

This works regardless of the external port (80, 8080, etc.)

## Production Deployment

For production, you typically:
1. Use port 80 (HTTP) and 443 (HTTPS)
2. Stop other services using these ports
3. Configure proper SSL certificates
4. Use a reverse proxy or load balancer

## Troubleshooting

### Issue: Still getting port conflict
**Solution**: Try a different port
```bash
NGINX_PORT=9000 docker-compose up -d
```

### Issue: Can't access http://localhost:8080
**Check:**
1. Is nginx container running?
   ```bash
   docker-compose ps nginx
   ```

2. Check nginx logs:
   ```bash
   docker-compose logs nginx
   ```

3. Is the port actually 8080?
   ```bash
   docker-compose ps | grep nginx
   ```

### Issue: Frontend/Backend not accessible through nginx
**Check nginx configuration:**
```bash
docker-compose exec nginx cat /etc/nginx/nginx.conf
docker-compose logs nginx
```

## Quick Commands

```bash
# Stop all containers
docker-compose down

# Start with custom port
NGINX_PORT=8080 docker-compose up -d

# Check what's running
docker-compose ps

# View nginx logs
docker-compose logs -f nginx

# Test nginx
curl http://localhost:8080
curl http://localhost:8080/api/health
```

## Windows-Specific: Disable IIS Permanently

If you don't need IIS:

1. Open **Control Panel** → **Programs** → **Turn Windows features on or off**
2. Uncheck **Internet Information Services**
3. Click OK and restart

Or via PowerShell (Admin):
```powershell
Disable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
```

## Port Recommendations

- **Development**: 8080, 8000, 3000, 9000
- **Production**: 80 (HTTP), 443 (HTTPS)
- **Avoid**: 3001 (backend), 3002 (frontend), 5432 (postgres), 6379 (redis)

## Environment Variables

Create `.env` file in project root:
```env
# Nginx
NGINX_PORT=8080

# Backend
BACKEND_PORT=3001

# Frontend
FRONTEND_PORT=3002

# Database
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379
```

## Summary

✅ **Changed nginx port from 80 to 3002**
✅ **Access application at http://localhost:3002**
✅ **No need to stop other services**
✅ **Can customize port via NGINX_PORT environment variable**

---

**Fixed by:** Kiro AI Assistant  
**Date:** February 5, 2026  
**Status:** ✅ Resolved  
**New URL:** http://localhost:3002
