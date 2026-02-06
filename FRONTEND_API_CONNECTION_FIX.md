# Frontend API Connection Fix

## Issue

The frontend is failing to fetch data from the backend API with errors like:
```
http://localhost:3001/api/products/trending?limit=8
Failed to fetch
```

## Root Cause

**Docker Desktop is not running**, which means the backend container is not available.

## Solution

### Step 1: Start Docker Desktop

1. **Open Docker Desktop** application on Windows
2. Wait for Docker to fully start (you'll see "Docker Desktop is running" in the system tray)
3. Verify Docker is running:
   ```powershell
   docker ps
   ```
   You should see a list of running containers (or an empty list if none are running)

### Step 2: Start the Application

Once Docker is running, start the containers:

```powershell
# Option 1: Using docker-compose
docker-compose up -d

# Option 2: Using the start script
.\start-docker.ps1

# Option 3: Using Make (if available)
make up
```

### Step 3: Verify Backend is Running

Check that the backend container is healthy:

```powershell
docker ps
```

You should see containers like:
- `ecommerce_backend` - Status: Up (healthy)
- `ecommerce_frontend` - Status: Up
- `ecommerce_db` - Status: Up

### Step 4: Test Backend API

Test the backend endpoints directly:

```powershell
# Test health endpoint
curl http://localhost:3001/api/health

# Test products endpoint
curl http://localhost:3001/api/products/trending?limit=8
```

You should get JSON responses, not connection errors.

### Step 5: Access the Frontend

Once the backend is running, open the frontend:

```
http://localhost:3002
```

The homepage should now load with products displayed.

## Troubleshooting

### Issue: Docker Desktop won't start

**Solution:**
1. Restart your computer
2. Check if Hyper-V is enabled (Windows Features)
3. Check if WSL 2 is installed and updated
4. Reinstall Docker Desktop if necessary

### Issue: Containers won't start

**Solution:**
```powershell
# Stop all containers
docker-compose down

# Remove old containers and volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build -d
```

### Issue: Backend is unhealthy

**Solution:**
```powershell
# Check backend logs
docker logs ecommerce_backend

# Common issues:
# 1. Database not ready - Wait 30 seconds and check again
# 2. Migration errors - Run migrations manually
# 3. Environment variables missing - Check backend/.env file
```

### Issue: CORS errors persist

**Solution:**
The CORS configuration has already been fixed in `backend/src/main.ts` to allow all localhost origins. If you still see CORS errors:

1. Clear browser cache
2. Hard refresh (Ctrl + Shift + R)
3. Check browser console for specific error messages

## Quick Start Commands

### Windows PowerShell

```powershell
# 1. Start Docker Desktop (manually from Start menu)

# 2. Wait for Docker to be ready
Start-Sleep -Seconds 10

# 3. Start containers
docker-compose up -d

# 4. Wait for backend to be healthy
Start-Sleep -Seconds 30

# 5. Check status
docker ps

# 6. View logs
docker logs ecommerce_backend --tail 50

# 7. Open frontend
Start-Process "http://localhost:3002"
```

### All-in-One Script

Create a file `start-all.ps1`:

```powershell
Write-Host "Starting TEKRA-STORE..." -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Docker is running ✓" -ForegroundColor Green

# Start containers
Write-Host "Starting containers..." -ForegroundColor Cyan
docker-compose up -d

# Wait for backend
Write-Host "Waiting for backend to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check health
Write-Host "Checking backend health..." -ForegroundColor Cyan
$health = curl -s http://localhost:3001/api/health 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Backend is healthy ✓" -ForegroundColor Green
} else {
    Write-Host "WARNING: Backend may not be ready yet" -ForegroundColor Yellow
    Write-Host "Check logs with: docker logs ecommerce_backend" -ForegroundColor Yellow
}

# Open frontend
Write-Host "Opening frontend..." -ForegroundColor Cyan
Start-Process "http://localhost:3002"

Write-Host "`nTEKRA-STORE is starting!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "Admin: http://localhost:3002/admin/login" -ForegroundColor Cyan
```

Run it:
```powershell
.\start-all.ps1
```

## Environment Variables

Ensure these are set in `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

And in `backend/.env`:

```env
PORT=3001
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=ecommerce
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
NODE_ENV=development
```

## API Endpoints Available

Once the backend is running, these endpoints should work:

### Public Endpoints (No Auth Required)
- `GET /api/health` - Health check
- `GET /api/products` - All products
- `GET /api/products/featured?limit=8` - Featured products
- `GET /api/products/trending?limit=8` - Trending products
- `GET /api/products/deals?limit=8` - Deal products
- `GET /api/products/new-arrivals?limit=8` - New arrivals
- `GET /api/products/:id` - Product by ID
- `GET /api/products/slug/:slug` - Product by slug
- `GET /api/categories` - All categories
- `GET /api/countries` - All countries

### Protected Endpoints (Auth Required)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/orders` - User orders
- `POST /api/cart` - Add to cart

## Summary

**The main issue is that Docker Desktop is not running.** 

To fix:
1. ✅ Start Docker Desktop
2. ✅ Run `docker-compose up -d`
3. ✅ Wait 30 seconds for backend to be healthy
4. ✅ Access http://localhost:3002

The frontend code is correct and the API endpoints exist. The backend just needs to be running!
