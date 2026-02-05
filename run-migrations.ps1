# PowerShell script to run database migrations in Docker environment

Write-Host "Running database migrations..." -ForegroundColor Cyan

# Check if docker-compose is available
$composeCmd = $null
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeCmd = "docker-compose"
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    # Check if docker compose (v2) is available
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $composeCmd = "docker compose"
    }
}

if (-not $composeCmd) {
    Write-Host "Error: Neither docker-compose nor docker compose is available" -ForegroundColor Red
    exit 1
}

# Run migrations in the backend container
Write-Host "Executing migrations in backend container..." -ForegroundColor Yellow

if ($composeCmd -eq "docker-compose") {
    docker-compose exec backend npm run migration:run
} else {
    docker compose exec backend npm run migration:run
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    exit 1
}
