# PowerShell script to diagnose and fix database migration issues

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Database Migration Diagnostic & Fix Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Determine docker compose command
$composeCmd = $null
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeCmd = "docker-compose"
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $composeCmd = "docker compose"
    }
}

if (-not $composeCmd) {
    Write-Host "Error: Neither docker-compose nor docker compose is available" -ForegroundColor Red
    exit 1
}

# Step 1: Check if containers are running
Write-Host "Step 1: Checking container status..." -ForegroundColor Yellow

$backendRunning = $false
$dbRunning = $false

if ($composeCmd -eq "docker-compose") {
    $containers = docker-compose ps
    $backendRunning = $containers -match "backend.*Up"
    $dbRunning = $containers -match "db.*Up"
} else {
    $containers = docker compose ps
    $backendRunning = $containers -match "backend.*Up"
    $dbRunning = $containers -match "db.*Up"
}

if ($backendRunning) {
    Write-Host "✓ Backend container is running" -ForegroundColor Green
} else {
    Write-Host "✗ Backend container is not running" -ForegroundColor Red
    Write-Host "Starting containers..." -ForegroundColor Yellow
    if ($composeCmd -eq "docker-compose") {
        docker-compose up -d
    } else {
        docker compose up -d
    }
    Start-Sleep -Seconds 5
}

if ($dbRunning) {
    Write-Host "✓ Database container is running" -ForegroundColor Green
} else {
    Write-Host "✗ Database container is not running" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check database connectivity
Write-Host "Step 2: Testing database connectivity..." -ForegroundColor Yellow

$dbTest = if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T db psql -U postgres -d ecommerce -c "SELECT 1;" 2>&1
} else {
    docker compose exec -T db psql -U postgres -d ecommerce -c "SELECT 1;" 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database is accessible" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot connect to database" -ForegroundColor Red
    Write-Host "Checking database logs..." -ForegroundColor Yellow
    if ($composeCmd -eq "docker-compose") {
        docker-compose logs --tail=20 db
    } else {
        docker compose logs --tail=20 db
    }
    exit 1
}

Write-Host ""

# Step 3: Check if migrations table exists
Write-Host "Step 3: Checking migrations table..." -ForegroundColor Yellow

$migrationsCheck = if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM migrations;" 2>&1
} else {
    docker compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM migrations;" 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations table exists" -ForegroundColor Green
    $migrationCount = if ($composeCmd -eq "docker-compose") {
        docker-compose exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM migrations;"
    } else {
        docker compose exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM migrations;"
    }
    Write-Host "  Found $($migrationCount.Trim()) migration(s) already run"
} else {
    Write-Host "⚠ Migrations table does not exist (first run)" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Check if supplier_submissions table exists
Write-Host "Step 4: Checking supplier_submissions table..." -ForegroundColor Yellow

$submissionsCheck = if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;" 2>&1
} else {
    docker compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM supplier_submissions;" 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ supplier_submissions table exists" -ForegroundColor Green
    $submissionCount = if ($composeCmd -eq "docker-compose") {
        docker-compose exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM supplier_submissions;"
    } else {
        docker compose exec -T db psql -U postgres -d ecommerce -t -c "SELECT COUNT(*) FROM supplier_submissions;"
    }
    Write-Host "  Found $($submissionCount.Trim()) submission(s)"
} else {
    Write-Host "✗ supplier_submissions table does not exist" -ForegroundColor Red
    Write-Host "  This table should be created by migration 1704312008000-AddSupplierAutomation"
}

Write-Host ""

# Step 5: Check if audit_logs table exists
Write-Host "Step 5: Checking audit_logs table..." -ForegroundColor Yellow

$auditCheck = if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM audit_logs;" 2>&1
} else {
    docker compose exec -T db psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM audit_logs;" 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ audit_logs table exists" -ForegroundColor Green
} else {
    Write-Host "✗ audit_logs table does not exist" -ForegroundColor Red
    Write-Host "  This table should be created by migration 1704312007000-AddAuditAndSecurity"
}

Write-Host ""

# Step 6: Run migrations
Write-Host "Step 6: Running database migrations..." -ForegroundColor Yellow
Write-Host "This may take a few moments..." -ForegroundColor Yellow
Write-Host ""

$migrationResult = if ($composeCmd -eq "docker-compose") {
    docker-compose exec -T backend npm run migration:run 2>&1
} else {
    docker compose exec -T backend npm run migration:run 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Migration failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking backend logs for errors..." -ForegroundColor Yellow
    if ($composeCmd -eq "docker-compose") {
        docker-compose logs --tail=50 backend
    } else {
        docker compose logs --tail=50 backend
    }
    exit 1
}

Write-Host ""

# Step 7: Verify tables were created
Write-Host "Step 7: Verifying tables..." -ForegroundColor Yellow

$tablesToCheck = @("supplier_submissions", "suppliers", "processing_logs", "audit_logs", "security_alerts")
$allExist = $true

foreach ($table in $tablesToCheck) {
    $tableCheck = if ($composeCmd -eq "docker-compose") {
        docker-compose exec -T db psql -U postgres -d ecommerce -c "SELECT 1 FROM $table LIMIT 1;" 2>&1
    } else {
        docker compose exec -T db psql -U postgres -d ecommerce -c "SELECT 1 FROM $table LIMIT 1;" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $table exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $table does not exist" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host ""

# Step 8: Restart backend to clear any cached errors
Write-Host "Step 8: Restarting backend container..." -ForegroundColor Yellow

if ($composeCmd -eq "docker-compose") {
    docker-compose restart backend | Out-Null
} else {
    docker compose restart backend | Out-Null
}

Write-Host "✓ Backend restarted" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($allExist) {
    Write-Host "SUCCESS: All tables exist and migrations are complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now access the WhatsApp admin dashboard at:"
    Write-Host "http://localhost:3000/admin/whatsapp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The following features are now available:"
    Write-Host "  • WhatsApp supplier submissions"
    Write-Host "  • AI-powered product extraction"
    Write-Host "  • Validation workflow"
    Write-Host "  • Inventory integration"
    Write-Host "  • Audit logging"
    Write-Host "  • Security monitoring"
} else {
    Write-Host "WARNING: Some tables are still missing" -ForegroundColor Yellow
    Write-Host "Please check the migration files and database logs"
    Write-Host ""
    Write-Host "To view migration status:"
    Write-Host "  $composeCmd exec backend npm run migration:show"
    Write-Host ""
    Write-Host "To view database logs:"
    Write-Host "  $composeCmd logs db"
}

Write-Host "==========================================" -ForegroundColor Cyan
