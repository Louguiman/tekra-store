Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Applying Docker Network Architecture" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will configure the app to use internal Docker networking" -ForegroundColor Gray
Write-Host "for efficient container-to-container communication." -ForegroundColor Gray
Write-Host ""

Write-Host "[1/5] Stopping containers..." -ForegroundColor Yellow
docker-compose down
Write-Host "✓ Containers stopped" -ForegroundColor Green
Write-Host ""

Write-Host "[2/5] Removing old images..." -ForegroundColor Yellow
docker rmi ecommerce_frontend 2>$null
docker rmi ecommerce_backend 2>$null
Write-Host "✓ Old images removed" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Rebuilding with Docker network configuration..." -ForegroundColor Yellow
Write-Host "   Frontend API routes will use: http://backend:3001/api" -ForegroundColor Gray
Write-Host "   (Internal Docker network - faster and more secure)" -ForegroundColor Gray
docker-compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Containers rebuilt" -ForegroundColor Green
Write-Host ""

Write-Host "[4/5] Starting all containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Containers started" -ForegroundColor Green
Write-Host ""

Write-Host "[5/5] Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "   (This may take 30-60 seconds)" -ForegroundColor Gray
Start-Sleep -Seconds 40

# Check backend
Write-Host "   Checking backend..." -ForegroundColor Gray
$backendHealthy = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendHealthy = $true
        Write-Host "   ✓ Backend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠ Backend not responding yet" -ForegroundColor Yellow
}

# Check frontend
Write-Host "   Checking frontend..." -ForegroundColor Gray
$frontendHealthy = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $frontendHealthy = $true
        Write-Host "   ✓ Frontend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠ Frontend not responding yet" -ForegroundColor Yellow
}

Write-Host ""

if ($backendHealthy -and $frontendHealthy) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ✓ All services are running!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🌐 Frontend:    http://localhost:3002" -ForegroundColor Cyan
    Write-Host "🔧 Backend API: http://localhost:3001/api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opening frontend in browser..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3002"
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  ⚠ Services are starting..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Services may need more time to initialize." -ForegroundColor Gray
    Write-Host "Check status with: docker ps" -ForegroundColor Gray
    Write-Host "View logs with: docker logs ecommerce_frontend" -ForegroundColor Gray
    Write-Host "               docker logs ecommerce_backend" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
