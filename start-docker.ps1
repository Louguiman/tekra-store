#!/usr/bin/env pwsh
# Start Docker Desktop and wait for it to be ready

Write-Host "🐳 Checking Docker status..." -ForegroundColor Cyan

# Check if Docker is already running
$dockerRunning = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if ($dockerRunning) {
    Write-Host "✅ Docker is already running!" -ForegroundColor Green
    docker --version
    exit 0
}

Write-Host "⚠️  Docker is not running. Starting Docker Desktop..." -ForegroundColor Yellow

# Try to start Docker Desktop
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

if (Test-Path $dockerPath) {
    Write-Host "🚀 Launching Docker Desktop..." -ForegroundColor Cyan
    Start-Process $dockerPath
    
    Write-Host "⏳ Waiting for Docker to start (this may take 30-60 seconds)..." -ForegroundColor Yellow
    
    # Wait for Docker to be ready (max 2 minutes)
    $timeout = 120
    $elapsed = 0
    $ready = $false
    
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        
        try {
            docker ps 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $ready = $true
                break
            }
        } catch {
            # Continue waiting
        }
        
        # Show progress
        $dots = "." * ($elapsed / 3 % 4)
        Write-Host "`r⏳ Waiting$dots    " -NoNewline -ForegroundColor Yellow
    }
    
    Write-Host "" # New line
    
    if ($ready) {
        Write-Host "✅ Docker is ready!" -ForegroundColor Green
        docker --version
        Write-Host ""
        Write-Host "You can now run:" -ForegroundColor Cyan
        Write-Host "  docker-compose up -d" -ForegroundColor White
        exit 0
    } else {
        Write-Host "❌ Docker failed to start within $timeout seconds" -ForegroundColor Red
        Write-Host "Please check Docker Desktop manually" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "❌ Docker Desktop not found at: $dockerPath" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
