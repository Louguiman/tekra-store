#!/bin/bash

# West Africa E-commerce Platform Deployment Script

set -e

echo "🚀 Starting deployment of West Africa E-commerce Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Dependencies check passed ✓"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.production template..."
        cp .env.production .env
        print_warning "Please edit .env file with your production values before continuing."
        read -p "Press Enter to continue after editing .env file..."
    fi
    
    print_status "Environment configuration check passed ✓"
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose down
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Services started ✓"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for database
    print_status "Waiting for database..."
    timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U postgres; do sleep 2; done'
    
    # Wait for backend
    print_status "Waiting for backend..."
    timeout 120 bash -c 'until curl -f http://localhost:3001/health; do sleep 5; done'
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    timeout 120 bash -c 'until curl -f http://localhost:3000; do sleep 5; done'
    
    print_status "All services are healthy ✓"
}

# Run database migrations and seeding
setup_database() {
    print_status "Setting up database..."
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose exec backend npm run migration:run
    
    # Run seeding
    print_status "Seeding database with initial data..."
    docker-compose exec backend npm run seed
    
    print_status "Database setup completed ✓"
}

# Show deployment status
show_status() {
    print_status "Deployment completed successfully! 🎉"
    echo ""
    echo "Services are running at:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001/api"
    echo "  Admin Dashboard: http://localhost:3000/admin"
    echo ""
    echo "Database:"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis: localhost:6379"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop services: docker-compose down"
    echo "To restart services: docker-compose restart"
}

# Main deployment flow
main() {
    check_dependencies
    check_environment
    deploy_services
    wait_for_services
    setup_database
    show_status
}

# Handle script arguments
case "${1:-}" in
    "build")
        print_status "Building images only..."
        docker-compose build --no-cache
        ;;
    "start")
        print_status "Starting services..."
        docker-compose up -d
        ;;
    "stop")
        print_status "Stopping services..."
        docker-compose down
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        main
        ;;
esac