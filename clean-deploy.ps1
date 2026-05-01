# West Africa E-commerce Platform - Clean Deployment Script (PowerShell)
# This script removes existing volumes to fix version incompatibilities (like Postgres 15 vs 16)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🧹 Starting Clean Deployment" -ForegroundColor Cyan
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

Write-Host "WARNING: This will delete all data in your database volumes!" -ForegroundColor Yellow
$confirmation = Read-Host "Are you sure you want to continue? (y/N)"
if ($confirmation -notmatch "^[Yy]$") {
    Write-Host "Deployment cancelled."
    exit 1
}

Write-Host "Stopping and removing containers with volumes..." -ForegroundColor Yellow
Invoke-Expression "$composeCmd down -v"

Write-Host "Building and starting services fresh..." -ForegroundColor Yellow
Invoke-Expression "$composeCmd up -d --build"

Write-Host ""
Write-Host "✓ Fresh deployment started successfully!" -ForegroundColor Green
Write-Host "You can check the logs with: $composeCmd logs -f"
