# West Africa E-commerce Platform - Makefile

.PHONY: help build start stop restart logs status health clean deploy deploy-prod dev test backup restore

# Default target
help:
	@echo "West Africa E-commerce Platform - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development environment"
	@echo "  test         - Run tests"
	@echo ""
	@echo "Deployment:"
	@echo "  build        - Build all Docker images"
	@echo "  deploy       - Deploy for development/staging"
	@echo "  deploy-prod  - Deploy for production"
	@echo "  start        - Start all services"
	@echo "  stop         - Stop all services"
	@echo "  restart      - Restart all services"
	@echo ""
	@echo "Monitoring:"
	@echo "  logs         - View all service logs"
	@echo "  status       - Show service status"
	@echo "  health       - Check service health"
	@echo ""
	@echo "Maintenance:"
	@echo "  backup       - Backup database and files"
	@echo "  restore      - Restore from backup"
	@echo "  clean        - Clean up containers and volumes"

# Development
dev:
	@echo "Starting development environment..."
	docker-compose up -d postgres redis
	@echo "Waiting for database..."
	@sleep 10
	docker-compose exec postgres pg_isready -U postgres || true
	@echo "Development environment ready!"
	@echo "Run 'npm run start:dev' in backend/ and 'npm run dev' in frontend/"

test:
	@echo "Running tests..."
	cd backend && npm test
	cd frontend && npm test

# Build
build:
	@echo "Building Docker images..."
	docker-compose build --no-cache

# Deployment
deploy: build
	@echo "Deploying for development/staging..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 30
	docker-compose exec backend npm run migration:run || true
	docker-compose exec backend npm run seed || true
	@echo "Deployment complete!"
	@make status

deploy-prod: build
	@echo "Deploying for production..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 60
	docker-compose exec backend npm run migration:run || true
	docker-compose exec backend npm run seed || true
	@echo "Production deployment complete!"
	@make status

# Service management
start:
	@echo "Starting services..."
	docker-compose up -d

stop:
	@echo "Stopping services..."
	docker-compose down

restart:
	@echo "Restarting services..."
	docker-compose restart

# Monitoring
logs:
	docker-compose logs -f

status:
	@echo "Service Status:"
	docker-compose ps
	@echo ""
	@echo "Service URLs:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:3001/api"
	@echo "  Admin Dashboard: http://localhost:3000/admin"
	@echo "  API Documentation: http://localhost:3001/api/docs"
	@echo ""
	@echo "Health Checks:"
	@echo "  Frontend: http://localhost:3000/health.json"
	@echo "  Backend: http://localhost:3001/api/health"

health:
	@echo "Checking service health..."
	@echo "Frontend Health:"
	@curl -s http://localhost:3000/health.json | jq . || echo "Frontend not responding"
	@echo ""
	@echo "Backend Health:"
	@curl -s http://localhost:3001/api/health | jq . || echo "Backend not responding"

# Maintenance
backup:
	@echo "Creating backup..."
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres ecommerce_db > backups/db-backup-$(shell date +%Y%m%d-%H%M%S).sql
	docker run --rm -v backend_uploads:/data -v $(PWD)/backups:/backup alpine tar czf /backup/uploads-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup complete!"

restore:
	@echo "Available backups:"
	@ls -la backups/
	@echo "To restore database: docker-compose exec -T postgres psql -U postgres ecommerce_db < backups/your-backup.sql"
	@echo "To restore files: docker run --rm -v backend_uploads:/data -v $(PWD)/backups:/backup alpine tar xzf /backup/your-backup.tar.gz -C /data"

clean:
	@echo "Cleaning up..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "Cleanup complete!"

# Database operations
db-shell:
	docker-compose exec postgres psql -U postgres ecommerce_db

db-migrate:
	docker-compose exec backend npm run migration:run

db-seed:
	docker-compose exec backend npm run seed

db-reset:
	docker-compose exec backend npm run migration:revert
	docker-compose exec backend npm run migration:run
	docker-compose exec backend npm run seed