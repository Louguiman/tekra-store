#!/usr/bin/env pwsh

Write-Host "=== Proxy Error Diagnostic Tool ===" -ForegroundColor Cyan
Write-Host "This script will help diagnose proxy 500 errors`n" -ForegroundColor Gray

# Step 1: Check containers
Write-Host "1. Checking container status..." -ForegroundColor Yellow
docker-compose ps
$backendRunning = docker ps --filter "name=ecommerce_backend" --filter "status=running" --format "{{.Names}}"
$frontendRunning = docker ps --filter "name=ecommerce_frontend" --filter "status=running" --format "{{.Names}}"

if (-not $backendRunning) {
    Write-Host "   ❌ Backend container is not running!" -ForegroundColor Red
} else {
    Write-Host "   ✓ Backend container is running" -ForegroundColor Green
}

if (-not $frontendRunning) {
    Write-Host "   ❌ Frontend container is not running!" -ForegroundColor Red
} else {
    Write-Host "   ✓ Frontend container is running" -ForegroundColor Green
}

# Step 2: Check backend health
Write-Host "`n2. Checking backend health..." -ForegroundColor Yellow
try {
    $backendHealth = docker exec ecommerce_backend curl -f http://localhost:3001/api/health 2>&1
    if ($backendHealth -match "status") {
        Write-Host "   ✓ Backend is healthy" -ForegroundColor Green
        Write-Host "   Response: $backendHealth" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Backend health check failed" -ForegroundColor Red
        Write-Host "   Response: $backendHealth" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Cannot reach backend: $_" -ForegroundColor Red
}

# Step 3: Check frontend can reach backend
Write-Host "`n3. Testing internal network connectivity..." -ForegroundColor Yellow
try {
    $networkTest = docker exec ecommerce_frontend wget -O- http://backend:3001/api/health 2>&1
    if ($networkTest -match "status") {
        Write-Host "   ✓ Frontend can reach backend via internal network" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Frontend cannot reach backend" -ForegroundColor Red
        Write-Host "   Response: $networkTest" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Network test failed: $_" -ForegroundColor Red
}

# Step 4: Check environment variables
Write-Host "`n4. Checking environment variables..." -ForegroundColor Yellow
try {
    $apiUrl = docker exec ecommerce_frontend env | Select-String "API_URL"
    if ($apiUrl) {
        Write-Host "   ✓ API_URL is set" -ForegroundColor Green
        Write-Host "   $apiUrl" -ForegroundColor Gray
        
        if ($apiUrl -match "http://backend:3001/api") {
            Write-Host "   ✓ API_URL is correct" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ API_URL might be incorrect" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ API_URL is not set!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Cannot check environment: $_" -ForegroundColor Red
}

# Step 5: Check recent backend logs
Write-Host "`n5. Recent backend logs (last 10 lines)..." -ForegroundColor Yellow
docker logs ecommerce_backend --tail 10 2>&1 | ForEach-Object {
    if ($_ -match "error|Error|ERROR") {
        Write-Host "   $_" -ForegroundColor Red
    } elseif ($_ -match "warn|Warn|WARN") {
        Write-Host "   $_" -ForegroundColor Yellow
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# Step 6: Check recent frontend logs
Write-Host "`n6. Recent frontend logs (last 10 lines)..." -ForegroundColor Yellow
docker logs ecommerce_frontend --tail 10 2>&1 | ForEach-Object {
    if ($_ -match "error|Error|ERROR|\[Proxy\] Error") {
        Write-Host "   $_" -ForegroundColor Red
    } elseif ($_ -match "warn|Warn|WARN") {
        Write-Host "   $_" -ForegroundColor Yellow
    } elseif ($_ -match "\[Proxy\]") {
        Write-Host "   $_" -ForegroundColor Cyan
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# Step 7: Test frontend health endpoint
Write-Host "`n7. Testing frontend health endpoint..." -ForegroundColor Yellow
try {
    $frontendHealth = curl -s http://localhost:3002/api/health 2>&1
    if ($frontendHealth) {
        Write-Host "   ✓ Frontend health endpoint is accessible" -ForegroundColor Green
        Write-Host "   Response: $frontendHealth" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Frontend health endpoint not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Cannot reach frontend health endpoint: $_" -ForegroundColor Red
}

# Step 8: Test products API
Write-Host "`n8. Testing products API..." -ForegroundColor Yellow
try {
    $productsTest = curl -s "http://localhost:3002/api/backend/products?limit=1" 2>&1
    if ($productsTest -match "products") {
        Write-Host "   ✓ Products API is working" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Products API returned error" -ForegroundColor Red
        Write-Host "   Response: $productsTest" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Products API test failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Diagnostic Summary ===" -ForegroundColor Cyan

$issues = @()
if (-not $backendRunning) { $issues += "Backend container not running" }
if (-not $frontendRunning) { $issues += "Frontend container not running" }

if ($issues.Count -eq 0) {
    Write-Host "✓ All basic checks passed" -ForegroundColor Green
    Write-Host "`nIf you're still experiencing issues:" -ForegroundColor Yellow
    Write-Host "1. Check the full logs: docker logs ecommerce_frontend -f" -ForegroundColor Gray
    Write-Host "2. Check backend logs: docker logs ecommerce_backend -f" -ForegroundColor Gray
    Write-Host "3. Try restarting: docker-compose restart backend frontend" -ForegroundColor Gray
} else {
    Write-Host "❌ Issues found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
}

# Offer to restart
Write-Host "`n=== Actions ===" -ForegroundColor Cyan
$restart = Read-Host "Do you want to restart the services? (y/n)"

if ($restart -eq "y") {
    Write-Host "`nRestarting backend and frontend..." -ForegroundColor Yellow
    docker-compose restart backend frontend
    
    Write-Host "`nWaiting for services to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host "`nChecking status..." -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host "`nTesting health..." -ForegroundColor Yellow
    try {
        $healthCheck = curl -s http://localhost:3002/api/health 2>&1
        Write-Host "Health check result: $healthCheck" -ForegroundColor Gray
    } catch {
        Write-Host "Health check failed: $_" -ForegroundColor Red
    }
    
    Write-Host "`n✓ Restart complete. Please test your application." -ForegroundColor Green
}

Write-Host "`nFor more detailed troubleshooting, see: PROXY_500_ERROR_TROUBLESHOOTING.md" -ForegroundColor Cyan
