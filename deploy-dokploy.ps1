# WestTech Gaming - Dokploy Deployment Script (PowerShell)
# This script helps troubleshoot and deploy the application on Dokploy

param(
    [string]$Action = "main"
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Check-Files {
    Write-Status "Checking required files..."
    
    $filesMissing = $false
    
    if (-not (Test-Path "backend/Dockerfile")) {
        Write-Error "backend/Dockerfile not found"
        $filesMissing = $true
    }
    
    if (-not (Test-Path "frontend/Dockerfile")) {
        Write-Error "frontend/Dockerfile not found"
        $filesMissing = $true
    }
    
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Error "docker-compose.yml not found"
        $filesMissing = $true
    }
    
    if (-not (Test-Path "backend/package.json")) {
        Write-Error "backend/package.json not found"
        $filesMissing = $true
    }
    
    if (-not (Test-Path "frontend/package.json")) {
        Write-Error "frontend/package.json not found"
        $filesMissing = $true
    }
    
    if ($filesMissing) {
        Write-Error "Some required files are missing. Please check your repository."
        exit 1
    }
    
    Write-Status "All required files found ✓"
}

function Test-LocalBuild {
    Write-Status "Testing local Docker build..."
    
    # Test backend build
    Write-Status "Building backend..."
    try {
        docker build -t westtech-backend-test ./backend
        Write-Status "Backend build successful ✓"
        docker rmi westtech-backend-test
    } catch {
        Write-Error "Backend build failed"
        return $false
    }
    
    # Test frontend build
    Write-Status "Building frontend..."
    try {
        docker build -t westtech-frontend-test ./frontend
        Write-Status "Frontend build successful ✓"
        docker rmi westtech-frontend-test
    } catch {
        Write-Error "Frontend build failed"
        return $false
    }
    
    return $true
}

function Test-SimpleBuild {
    Write-Status "Testing simple Docker build..."
    
    # Test backend simple build
    if (Test-Path "backend/Dockerfile.simple") {
        Write-Status "Building backend (simple)..."
        try {
            docker build -f backend/Dockerfile.simple -t westtech-backend-simple-test ./backend
            Write-Status "Backend simple build successful ✓"
            docker rmi westtech-backend-simple-test
        } catch {
            Write-Error "Backend simple build failed"
            return $false
        }
    }
    
    # Test frontend simple build
    if (Test-Path "frontend/Dockerfile.simple") {
        Write-Status "Building frontend (simple)..."
        try {
            docker build -f frontend/Dockerfile.simple -t westtech-frontend-simple-test ./frontend
            Write-Status "Frontend simple build successful ✓"
            docker rmi westtech-frontend-simple-test
        } catch {
            Write-Error "Frontend simple build failed"
            return $false
        }
    }
    
    return $true
}

function Test-ComposeConfig {
    Write-Status "Validating docker-compose configuration..."
    
    try {
        docker-compose config | Out-Null
        Write-Status "Docker-compose configuration is valid ✓"
        return $true
    } catch {
        Write-Error "Docker-compose configuration is invalid"
        Write-Warning "Running docker-compose config to show errors:"
        docker-compose config
        return $false
    }
}

function Show-DeploymentOptions {
    Write-Host ""
    Write-Status "Deployment Options for Dokploy:"
    Write-Host ""
    Write-Host "1. Standard Deployment:"
    Write-Host "   docker-compose up -d"
    Write-Host ""
    Write-Host "2. Simple Deployment (if standard fails):"
    Write-Host "   docker-compose -f docker-compose.simple.yml up -d"
    Write-Host ""
    Write-Host "3. Environment Configuration:"
    Write-Host "   Copy-Item .env.dokploy .env"
    Write-Host "   # Edit .env with your values"
    Write-Host ""
    Write-Host "4. Manual Build (if Dokploy has issues):"
    Write-Host "   docker build -t your-registry/westtech-backend ./backend"
    Write-Host "   docker build -t your-registry/westtech-frontend ./frontend"
    Write-Host "   docker push your-registry/westtech-backend"
    Write-Host "   docker push your-registry/westtech-frontend"
    Write-Host ""
}

function Create-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Status "Creating .env file from template..."
        Copy-Item .env.dokploy .env
        Write-Warning "Please edit .env file with your production values!"
    } else {
        Write-Status ".env file already exists"
    }
}

function Main {
    Write-Host "🎮 WestTech Gaming - Dokploy Deployment Helper" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    
    Check-Files
    
    Write-Status "Testing Docker builds locally..."
    if (Test-LocalBuild) {
        Write-Status "Local builds successful - standard deployment should work"
    } else {
        Write-Warning "Standard build failed, trying simple build..."
        if (Test-SimpleBuild) {
            Write-Status "Simple builds successful - use docker-compose.simple.yml"
        } else {
            Write-Error "Both build methods failed. Check Dockerfile configurations."
            exit 1
        }
    }
    
    Test-ComposeConfig
    Create-EnvFile
    Show-DeploymentOptions
    
    Write-Status "Pre-deployment checks completed successfully!"
    Write-Warning "Remember to:"
    Write-Host "  1. Update .env with your production values"
    Write-Host "  2. Change default passwords and secrets"
    Write-Host "  3. Configure your domain URLs"
    Write-Host "  4. Set up SSL certificates for production"
}

# Handle script arguments
switch ($Action) {
    "check" {
        Check-Files
    }
    "build" {
        Test-LocalBuild
    }
    "simple" {
        Test-SimpleBuild
    }
    "validate" {
        Test-ComposeConfig
    }
    default {
        Main
    }
}