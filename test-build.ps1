# Test Docker Build Script

Write-Host "Testing Docker builds..." -ForegroundColor Green

# Test backend build
Write-Host "Building backend..." -ForegroundColor Yellow
try {
    docker build -t ecommerce-backend ./backend
    Write-Host "✅ Backend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend build failed: $_" -ForegroundColor Red
    exit 1
}

# Test frontend build
Write-Host "Building frontend..." -ForegroundColor Yellow
try {
    docker build -t ecommerce-frontend ./frontend
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "All builds completed successfully!" -ForegroundColor Green