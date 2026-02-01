# West Africa E-commerce Platform Deployment Script (PowerShell)

param(
    [string]$Action = "deploy"
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

function Check-Dependencies {
    Write-Status "Checking dependencies..."
    
    try {
        docker --version | Out-Null
    } catch {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    try {
        docker-compose --version | Out-Null
    } catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    Write-Status "Dependencies check passed ✓"
}

function Check-Environment {
    Write-Status "Checking environment configuration..."
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from .env.production template..."
        Copy-Item ".env.production" ".env"
        Write-Warning "Please edit .env file with your production values before continuing."
        Read-Host "Press Enter to continue after editing .env file"
    }
    
    Write-Status "Environment configuration check passed ✓"
}

function Deploy-Services {
    Write-Status "Building and starting services..."
    
    # Stop existing services
    Write-Status "Stopping existing services..."
    docker-compose down
    
    # Build images
    Write-Status "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    Write-Status "Starting services..."
    docker-compose up -d
    
    Write-Status "Services started ✓"
}

function Wait-ForServices {
    Write-Status "Waiting for services to be healthy..."
    
    # Wait for database
    Write-Status "Waiting for database..."
    $timeout = 60
    $elapsed = 0
    do {
        Start-Sleep 2
        $elapsed += 2
        try {
            docker-compose exec -T postgres pg_isready -U postgres | Out-Null
            break
        } catch {
            if ($elapsed -ge $timeout) {
                Write-Error "Database failed to start within $timeout seconds"
                exit 1
            }
        }
    } while ($elapsed -lt $timeout)
    
    # Wait for backend
    Write-Status "Waiting for backend..."
    $timeout = 120
    $elapsed = 0
    do {
        Start-Sleep 5
        $elapsed += 5
        try {
            Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing | Out-Null
            break
        } catch {
            if ($elapsed -ge $timeout) {
                Write-Error "Backend failed to start within $timeout seconds"
                exit 1
            }
        }
    } while ($elapsed -lt $timeout)
    
    # Wait for frontend
    Write-Status "Waiting for frontend..."
    $timeout = 120
    $elapsed = 0
    do {
        Start-Sleep 5
        $elapsed += 5
        try {
            Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing | Out-Null
            break
        } catch {
            if ($elapsed -ge $timeout) {
                Write-Error "Frontend failed to start within $timeout seconds"
                exit 1
            }
        }
    } while ($elapsed -lt $timeout)
    
    Write-Status "All services are healthy ✓"
}

function Setup-Database {
    Write-Status "Setting up database..."
    
    # Run migrations
    Write-Status "Running database migrations..."
    docker-compose exec backend npm run migration:run
    
    # Run seeding
    Write-Status "Seeding database with initial data..."
    docker-compose exec backend npm run seed
    
    Write-Status "Database setup completed ✓"
}

function Show-Status {
    Write-Status "Deployment completed successfully! 🎉"
    Write-Host ""
    Write-Host "Services are running at:"
    Write-Host "  Frontend: http://localhost:3000"
    Write-Host "  Backend API: http://localhost:3001/api"
    Write-Host "  Admin Dashboard: http://localhost:3000/admin"
    Write-Host ""
    Write-Host "Database:"
    Write-Host "  PostgreSQL: localhost:5432"
    Write-Host "  Redis: localhost:6379"
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f"
    Write-Host "To stop services: docker-compose down"
    Write-Host "To restart services: docker-compose restart"
}

function Main {
    Check-Dependencies
    Check-Environment
    Deploy-Services
    Wait-ForServices
    Setup-Database
    Show-Status
}

# Handle script arguments
switch ($Action) {
    "build" {
        Write-Status "Building images only..."
        docker-compose build --no-cache
    }
    "start" {
        Write-Status "Starting services..."
        docker-compose up -d
    }
    "stop" {
        Write-Status "Stopping services..."
        docker-compose down
    }
    "restart" {
        Write-Status "Restarting services..."
        docker-compose restart
    }
    "logs" {
        docker-compose logs -f
    }
    "status" {
        docker-compose ps
    }
    default {
        Main
    }
}