Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEKRA-STORE Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from the Start menu" -ForegroundColor White
    Write-Host "2. Wait for it to fully start (check system tray)" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
Write-Host ""

# Start containers
Write-Host "[2/6] Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    Write-Host "Try running: docker-compose down -v" -ForegroundColor Yellow
    Write-Host "Then run this script again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Containers started" -ForegroundColor Green
Write-Host ""

# Wait for database
Write-Host "[3/6] Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✓ Database should be ready" -ForegroundColor Green
Write-Host ""

# Wait for backend
Write-Host "[4/6] Waiting for backend to initialize..." -ForegroundColor Yellow
Write-Host "   (This may take 30-60 seconds on first run)" -ForegroundColor Gray
Start-Sleep -Seconds 30
Write-Host "✓ Backend initialization complete" -ForegroundColor Green
Write-Host ""

# Check backend health
Write-Host "[5/6] Checking backend health..." -ForegroundColor Yellow
$maxRetries = 5
$retryCount = 0
$backendHealthy = $false

while ($retryCount -lt $maxRetries -and -not $backendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendHealthy = $true
            Write-Host "✓ Backend is healthy and responding" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "   Retry $retryCount/$maxRetries..." -ForegroundColor Gray
            Start-Sleep -Seconds 10
        }
    }
}

if (-not $backendHealthy) {
    Write-Host "⚠ Backend may not be fully ready yet" -ForegroundColor Yellow
    Write-Host "   Check logs with: docker logs ecommerce_backend" -ForegroundColor Gray
}
Write-Host ""

# Open frontend
Write-Host "[6/6] Opening frontend in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:3002"
Write-Host "✓ Frontend opened" -ForegroundColor Green
Write-Host ""

# Display summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEKRA-STORE is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend:    http://localhost:3002" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "👤 Admin:       http://localhost:3002/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker ps                    - View running containers" -ForegroundColor White
Write-Host "  docker logs ecommerce_backend - View backend logs" -ForegroundColor White
Write-Host "  docker logs ecommerce_frontend - View frontend logs" -ForegroundColor White
Write-Host "  docker-compose down          - Stop all containers" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring (containers will keep running)" -ForegroundColor Gray
Write-Host ""

# Keep script running and show logs
Write-Host "Showing backend logs (Ctrl+C to exit):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
docker logs -f ecommerce_backend
