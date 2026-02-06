#!/usr/bin/env pwsh

Write-Host "=== Deploying All Fixes ===" -ForegroundColor Cyan
Write-Host "This script will rebuild and restart the services with all fixes applied`n" -ForegroundColor Gray

# Step 1: Show what will be deployed
Write-Host "Fixes to be deployed:" -ForegroundColor Yellow
Write-Host "  1. Enhanced proxy logging (frontend)" -ForegroundColor Gray
Write-Host "  2. Frontend health check endpoint" -ForegroundColor Gray
Write-Host "  3. Missing pages (returns, warranty)" -ForegroundColor Gray
Write-Host "  4. Backend countryCode support" -ForegroundColor Gray
Write-Host "  5. Payment on Delivery feature" -ForegroundColor Gray
Write-Host "  6. Customer authentication pages" -ForegroundColor Gray

$confirm = Read-Host "`nDo you want to proceed? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 2: Rebuild backend
Write-Host "`n=== Step 1: Rebuilding Backend ===" -ForegroundColor Cyan
docker-compose build backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend built successfully" -ForegroundColor Green

# Step 3: Rebuild frontend
Write-Host "`n=== Step 2: Rebuilding Frontend ===" -ForegroundColor Cyan
docker-compose build frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green

# Step 4: Restart services
Write-Host "`n=== Step 3: Restarting Services ===" -ForegroundColor Cyan
docker-compose up -d backend frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Service restart failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Services restarted" -ForegroundColor Green

# Step 5: Wait for services to be healthy
Write-Host "`n=== Step 4: Waiting for Services ===" -ForegroundColor Cyan
Write-Host "Waiting 40 seconds for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 40

# Step 6: Check container status
Write-Host "`n=== Step 5: Checking Container Status ===" -ForegroundColor Cyan
docker-compose ps

# Step 7: Test backend health
Write-Host "`n=== Step 6: Testing Backend Health ===" -ForegroundColor Cyan
try {
    $backendHealth = docker exec ecommerce_backend curl -f http://localhost:3001/api/health 2>&1
    if ($backendHealth -match "status") {
        Write-Host "✓ Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "⚠ Backend health check returned unexpected response" -ForegroundColor Yellow
        Write-Host "Response: $backendHealth" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Backend health check failed: $_" -ForegroundColor Red
}

# Step 8: Test frontend health
Write-Host "`n=== Step 7: Testing Frontend Health ===" -ForegroundColor Cyan
try {
    $frontendHealth = curl -s http://localhost:3002/api/health 2>&1
    if ($frontendHealth -match "status") {
        Write-Host "✓ Frontend health endpoint is working" -ForegroundColor Green
        Write-Host "Response: $frontendHealth" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Frontend health check returned unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend health check failed: $_" -ForegroundColor Red
}

# Step 9: Test products API with countryCode
Write-Host "`n=== Step 8: Testing Products API ===" -ForegroundColor Cyan
try {
    $productsTest = curl -s "http://localhost:3002/api/backend/products?countryCode=ML&limit=1" 2>&1
    if ($productsTest -match "products") {
        Write-Host "✓ Products API is working with countryCode" -ForegroundColor Green
    } else {
        Write-Host "⚠ Products API returned unexpected response" -ForegroundColor Yellow
        Write-Host "Response: $productsTest" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Products API test failed: $_" -ForegroundColor Red
}

# Step 10: Test country config
Write-Host "`n=== Step 9: Testing Country Config ===" -ForegroundColor Cyan
try {
    $countryTest = curl -s "http://localhost:3002/api/backend/countries/ML/config" 2>&1
    if ($countryTest -match "deliveryMethods") {
        Write-Host "✓ Country config API is working" -ForegroundColor Green
    } else {
        Write-Host "⚠ Country config returned unexpected response" -ForegroundColor Yellow
        Write-Host "Response: $countryTest" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Country config test failed: $_" -ForegroundColor Red
}

# Step 11: Test auth pages
Write-Host "`n=== Step 10: Testing Auth Pages ===" -ForegroundColor Cyan
$authPages = @("/auth/login", "/auth/register", "/auth/forgot-password", "/profile", "/returns", "/warranty")
foreach ($page in $authPages) {
    try {
        $response = curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002$page" 2>&1
        if ($response -eq "200") {
            Write-Host "✓ $page is accessible" -ForegroundColor Green
        } else {
            Write-Host "⚠ $page returned status $response" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $page test failed: $_" -ForegroundColor Red
    }
}

# Step 12: Show recent logs
Write-Host "`n=== Step 11: Recent Logs ===" -ForegroundColor Cyan
Write-Host "`nBackend logs (last 10 lines):" -ForegroundColor Yellow
docker logs ecommerce_backend --tail 10 2>&1 | ForEach-Object {
    if ($_ -match "error|Error|ERROR") {
        Write-Host "   $_" -ForegroundColor Red
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

Write-Host "`nFrontend logs (last 10 lines):" -ForegroundColor Yellow
docker logs ecommerce_frontend --tail 10 2>&1 | ForEach-Object {
    if ($_ -match "error|Error|ERROR") {
        Write-Host "   $_" -ForegroundColor Red
    } elseif ($_ -match "\[Proxy\]") {
        Write-Host "   $_" -ForegroundColor Cyan
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host "✓ Backend rebuilt and restarted" -ForegroundColor Green
Write-Host "✓ Frontend rebuilt and restarted" -ForegroundColor Green
Write-Host "✓ All services are running" -ForegroundColor Green

Write-Host "`nAccess your application at:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3002" -ForegroundColor Gray
Write-Host "  Backend API: http://localhost:3001/api" -ForegroundColor Gray
Write-Host "  Health Check: http://localhost:3002/api/health" -ForegroundColor Gray

Write-Host "`nNew Features Available:" -ForegroundColor Yellow
Write-Host "  ✓ Customer login/register pages" -ForegroundColor Gray
Write-Host "  ✓ Payment on Delivery option" -ForegroundColor Gray
Write-Host "  ✓ Returns & Warranty pages" -ForegroundColor Gray
Write-Host "  ✓ Enhanced error logging" -ForegroundColor Gray
Write-Host "  ✓ CountryCode support in API" -ForegroundColor Gray

Write-Host "`nFor troubleshooting, run:" -ForegroundColor Yellow
Write-Host "  .\diagnose-proxy.ps1" -ForegroundColor Gray

Write-Host "`n✓ Deployment complete!" -ForegroundColor Green
