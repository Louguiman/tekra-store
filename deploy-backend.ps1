# Deploy Backend with Updated CORS Configuration
# This script rebuilds and restarts the backend service

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop backend
Write-Host "[1/4] Stopping backend service..." -ForegroundColor Yellow
docker-compose stop backend
Write-Host "✓ Backend stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Rebuild backend
Write-Host "[2/4] Rebuilding backend with updated CORS..." -ForegroundColor Yellow
docker-compose build backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend rebuilt successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Start backend
Write-Host "[3/4] Starting backend service..." -ForegroundColor Yellow
docker-compose up -d backend
Write-Host "✓ Backend started" -ForegroundColor Green
Write-Host ""

# Step 4: Wait for backend to be healthy
Write-Host "[4/4] Waiting for backend to be healthy..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    $attempt++
    Start-Sleep -Seconds 2
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            Write-Host "✓ Backend is healthy!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Waiting..." -ForegroundColor Gray
    }
}

if (-not $healthy) {
    Write-Host "✗ Backend health check failed after $maxAttempts attempts" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking logs..." -ForegroundColor Yellow
    docker logs ecommerce_backend --tail 50
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend is now running with updated CORS configuration" -ForegroundColor Green
Write-Host ""
Write-Host "Allowed origins:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3000" -ForegroundColor White
Write-Host "  - http://localhost:3002" -ForegroundColor White
Write-Host "  - https://shop.sankaretech.com" -ForegroundColor White
Write-Host "  - http://shop.sankaretech.com" -ForegroundColor White
Write-Host ""
Write-Host "Test the backend:" -ForegroundColor Cyan
Write-Host "  curl http://localhost:3001/api/health" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Cyan
Write-Host "  docker logs ecommerce_backend -f" -ForegroundColor White
Write-Host ""
