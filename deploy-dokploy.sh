#!/bin/bash

# WestTech Gaming - Dokploy Deployment Script
# This script helps troubleshoot and deploy the application on Dokploy

set -e

echo "🎮 WestTech Gaming - Dokploy Deployment Helper"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if files exist
check_files() {
    print_status "Checking required files..."
    
    local files_missing=false
    
    if [ ! -f "backend/Dockerfile" ]; then
        print_error "backend/Dockerfile not found"
        files_missing=true
    fi
    
    if [ ! -f "frontend/Dockerfile" ]; then
        print_error "frontend/Dockerfile not found"
        files_missing=true
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        files_missing=true
    fi
    
    if [ ! -f "backend/package.json" ]; then
        print_error "backend/package.json not found"
        files_missing=true
    fi
    
    if [ ! -f "frontend/package.json" ]; then
        print_error "frontend/package.json not found"
        files_missing=true
    fi
    
    if [ "$files_missing" = true ]; then
        print_error "Some required files are missing. Please check your repository."
        exit 1
    fi
    
    print_status "All required files found ✓"
}

# Function to test local build
test_local_build() {
    print_status "Testing local Docker build..."
    
    # Test backend build
    print_status "Building backend..."
    if docker build -t westtech-backend-test ./backend; then
        print_status "Backend build successful ✓"
        docker rmi westtech-backend-test
    else
        print_error "Backend build failed"
        return 1
    fi
    
    # Test frontend build
    print_status "Building frontend..."
    if docker build -t westtech-frontend-test ./frontend; then
        print_status "Frontend build successful ✓"
        docker rmi westtech-frontend-test
    else
        print_error "Frontend build failed"
        return 1
    fi
}

# Function to test simple build
test_simple_build() {
    print_status "Testing simple Docker build..."
    
    # Test backend simple build
    if [ -f "backend/Dockerfile.simple" ]; then
        print_status "Building backend (simple)..."
        if docker build -f backend/Dockerfile.simple -t westtech-backend-simple-test ./backend; then
            print_status "Backend simple build successful ✓"
            docker rmi westtech-backend-simple-test
        else
            print_error "Backend simple build failed"
            return 1
        fi
    fi
    
    # Test frontend simple build
    if [ -f "frontend/Dockerfile.simple" ]; then
        print_status "Building frontend (simple)..."
        if docker build -f frontend/Dockerfile.simple -t westtech-frontend-simple-test ./frontend; then
            print_status "Frontend simple build successful ✓"
            docker rmi westtech-frontend-simple-test
        else
            print_error "Frontend simple build failed"
            return 1
        fi
    fi
}

# Function to validate docker-compose
validate_compose() {
    print_status "Validating docker-compose configuration..."
    
    if docker-compose config > /dev/null 2>&1; then
        print_status "Docker-compose configuration is valid ✓"
    else
        print_error "Docker-compose configuration is invalid"
        print_warning "Running docker-compose config to show errors:"
        docker-compose config
        return 1
    fi
}

# Function to show deployment options
show_deployment_options() {
    echo ""
    print_status "Deployment Options for Dokploy:"
    echo ""
    echo "1. Standard Deployment:"
    echo "   docker-compose up -d"
    echo ""
    echo "2. Simple Deployment (if standard fails):"
    echo "   docker-compose -f docker-compose.simple.yml up -d"
    echo ""
    echo "3. Environment Configuration:"
    echo "   cp .env.dokploy .env"
    echo "   # Edit .env with your values"
    echo ""
    echo "4. Manual Build (if Dokploy has issues):"
    echo "   docker build -t your-registry/westtech-backend ./backend"
    echo "   docker build -t your-registry/westtech-frontend ./frontend"
    echo "   docker push your-registry/westtech-backend"
    echo "   docker push your-registry/westtech-frontend"
    echo ""
}

# Function to create environment file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp .env.dokploy .env
        print_warning "Please edit .env file with your production values!"
    else
        print_status ".env file already exists"
    fi
}

# Main execution
main() {
    check_files
    
    print_status "Testing Docker builds locally..."
    if test_local_build; then
        print_status "Local builds successful - standard deployment should work"
    else
        print_warning "Standard build failed, trying simple build..."
        if test_simple_build; then
            print_status "Simple builds successful - use docker-compose.simple.yml"
        else
            print_error "Both build methods failed. Check Dockerfile configurations."
            exit 1
        fi
    fi
    
    validate_compose
    create_env_file
    show_deployment_options
    
    print_status "Pre-deployment checks completed successfully!"
    print_warning "Remember to:"
    echo "  1. Update .env with your production values"
    echo "  2. Change default passwords and secrets"
    echo "  3. Configure your domain URLs"
    echo "  4. Set up SSL certificates for production"
}

# Handle script arguments
case "${1:-}" in
    "check")
        check_files
        ;;
    "build")
        test_local_build
        ;;
    "simple")
        test_simple_build
        ;;
    "validate")
        validate_compose
        ;;
    *)
        main
        ;;
esac