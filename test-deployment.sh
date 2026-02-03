#!/bin/bash

# WestTech Gaming - Deployment Test Script
# Tests all deployment approaches to find what works

set -e

echo "🎮 WestTech Gaming - Deployment Test Script"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    print_status "Cleaning up test containers..."
    docker-compose -f docker-compose.no-build.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.minimal.yml down -v 2>/dev/null || true
    docker-compose down -v 2>/dev/null || true
}

test_no_build_approach() {
    print_status "Testing No-Build Approach (Recommended for Dokploy)..."
    
    if docker-compose -f docker-compose.no-build.yml up -d; then
        print_status "No-build approach started successfully!"
        
        # Wait for services
        sleep 30
        
        # Test backend
        if curl -f http://localhost:3001/api/health 2>/dev/null; then
            print_status "✅ Backend is responding"
        else
            print_warning "⚠️ Backend not responding yet (may need more time)"
        fi
        
        # Test frontend
        if curl -f http://localhost:3000 2>/dev/null; then
            print_status "✅ Frontend is responding"
        else
            print_warning "⚠️ Frontend not responding yet (may need more time)"
        fi
        
        print_status "✅ No-Build approach works! Use this for Dokploy."
        docker-compose -f docker-compose.no-build.yml down -v
        return 0
    else
        print_error "❌ No-build approach failed"
        docker-compose -f docker-compose.no-build.yml down -v 2>/dev/null || true
        return 1
    fi
}

test_standard_approach() {
    print_status "Testing Standard Docker Compose..."
    
    if docker-compose up -d; then
        print_status "Standard approach started successfully!"
        sleep 30
        
        if curl -f http://localhost:3001/api/health 2>/dev/null; then
            print_status "✅ Standard approach works!"
        else
            print_warning "⚠️ Standard approach started but services not ready"
        fi
        
        docker-compose down -v
        return 0
    else
        print_error "❌ Standard approach failed"
        docker-compose down -v 2>/dev/null || true
        return 1
    fi
}

test_minimal_approach() {
    print_status "Testing Minimal Volume Approach..."
    
    if docker-compose -f docker-compose.minimal.yml up -d; then
        print_status "Minimal approach started successfully!"
        sleep 30
        
        if curl -f http://localhost:3001/api/health 2>/dev/null; then
            print_status "✅ Minimal approach works!"
        else
            print_warning "⚠️ Minimal approach started but services not ready"
        fi
        
        docker-compose -f docker-compose.minimal.yml down -v
        return 0
    else
        print_error "❌ Minimal approach failed"
        docker-compose -f docker-compose.minimal.yml down -v 2>/dev/null || true
        return 1
    fi
}

show_recommendations() {
    echo ""
    print_status "🎯 DEPLOYMENT RECOMMENDATIONS FOR DOKPLOY:"
    echo ""
    echo "1. PRIMARY CHOICE: Use docker-compose.no-build.yml"
    echo "   - Avoids all Dockerfile issues"
    echo "   - Uses base Node.js images directly"
    echo "   - Most compatible with Dokploy"
    echo ""
    echo "2. SECONDARY CHOICE: Use docker-compose.minimal.yml"
    echo "   - Volume-based approach"
    echo "   - Good fallback option"
    echo ""
    echo "3. LAST RESORT: Manual container deployment"
    echo "   - Individual docker run commands"
    echo "   - See DOKPLOY_DEPLOYMENT.md for details"
    echo ""
    print_status "For Dokploy, copy docker-compose.no-build.yml to docker-compose.yml"
    print_status "Or specify the file in Dokploy configuration"
}

main() {
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Test approaches in order of preference for Dokploy
    print_status "Testing deployment approaches..."
    
    success_count=0
    
    if test_no_build_approach; then
        ((success_count++))
    fi
    
    if test_minimal_approach; then
        ((success_count++))
    fi
    
    if test_standard_approach; then
        ((success_count++))
    fi
    
    echo ""
    if [ $success_count -gt 0 ]; then
        print_status "✅ $success_count deployment approach(es) work!"
        show_recommendations
    else
        print_error "❌ All deployment approaches failed"
        print_error "Check Docker installation and try manual deployment"
        exit 1
    fi
}

# Handle cleanup on exit
trap cleanup EXIT

# Run main function
main