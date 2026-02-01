# West Africa E-commerce Platform - Deployment Guide

This guide provides comprehensive instructions for deploying the West Africa E-commerce Platform using Docker Compose.

## Prerequisites

### System Requirements
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Internet connection for downloading images and dependencies

### Installation
1. **Install Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
2. **Install Docker Compose** (usually included with Docker Desktop)

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd west-africa-ecommerce
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.production .env

# Edit environment variables
nano .env  # or use your preferred editor
```

### 3. Deploy (Automated)
```bash
# Linux/Mac
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

### 4. Access the Platform
- **Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Backend API**: http://localhost:3001/api

## Manual Deployment

### 1. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-for-production

# Payment Provider API Keys
ORANGE_MONEY_API_KEY=your-production-orange-money-api-key
WAVE_API_KEY=your-production-wave-api-key
MOOV_API_KEY=your-production-moov-api-key
CARD_PAYMENT_API_KEY=your-production-card-payment-api-key
```

### 2. Build and Start Services

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 3. Initialize Database

```bash
# Run database migrations
docker-compose exec backend npm run migration:run

# Seed initial data
docker-compose exec backend npm run seed
```

## Service Architecture

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 80, 443 | Reverse proxy and load balancer |
| **frontend** | 3000 | Next.js React application |
| **backend** | 3001 | NestJS API server |
| **postgres** | 5432 | PostgreSQL database |
| **redis** | 6379 | Redis cache and sessions |

### Network Architecture

```
Internet → Nginx (80/443) → Frontend (3000) / Backend (3001)
                          ↓
                     PostgreSQL (5432) + Redis (6379)
```

## Configuration

### Environment Variables

#### Backend Configuration
- `NODE_ENV`: Application environment (production)
- `JWT_SECRET`: Secret key for JWT token signing
- `DB_*`: Database connection parameters
- `*_API_KEY`: Payment provider API keys

#### Frontend Configuration
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_URL`: Frontend application URL

### Database Configuration

The platform uses PostgreSQL with the following default settings:
- **Database**: `ecommerce_db`
- **Username**: `postgres`
- **Password**: `password` (change in production)
- **Port**: `5432`

### File Storage

Uploaded files are stored in Docker volumes:
- **Volume**: `backend_uploads`
- **Path**: `/app/uploads` (inside container)
- **Access**: Via Nginx at `/uploads/`

## Production Deployment

### 1. Security Configuration

#### SSL/HTTPS Setup
1. Obtain SSL certificates for your domain
2. Place certificates in `nginx/ssl/` directory
3. Update `nginx/nginx.conf` to enable HTTPS server block
4. Update environment variables with your domain

#### Environment Security
```env
# Use strong, unique secrets
JWT_SECRET=generate-a-strong-random-secret-key

# Use production database credentials
DB_PASSWORD=strong-database-password

# Configure real payment provider keys
ORANGE_MONEY_API_KEY=prod-orange-key
WAVE_API_KEY=prod-wave-key
```

### 2. Performance Optimization

#### Resource Limits
Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

#### Database Optimization
```yaml
postgres:
  environment:
    POSTGRES_SHARED_PRELOAD_LIBRARIES: pg_stat_statements
    POSTGRES_MAX_CONNECTIONS: 200
    POSTGRES_SHARED_BUFFERS: 256MB
```

### 3. Monitoring and Logging

#### Health Checks
All services include health checks:
- **Database**: `pg_isready` command
- **Redis**: `redis-cli ping`
- **Backend**: HTTP health endpoint
- **Frontend**: HTTP availability check

#### Log Management
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Limit log output
docker-compose logs --tail=100 -f
```

## Maintenance

### Backup and Restore

#### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres ecommerce_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres ecommerce_db < backup.sql
```

#### File Backup
```bash
# Backup uploaded files
docker run --rm -v backend_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# Restore uploaded files
docker run --rm -v backend_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

### Updates and Scaling

#### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

#### Scale Services
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale frontend instances
docker-compose up -d --scale frontend=2
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service logs
docker-compose logs service-name

# Check service status
docker-compose ps

# Restart specific service
docker-compose restart service-name
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d ecommerce_db -c "SELECT 1;"
```

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop service-name
```

### Performance Issues

#### High Memory Usage
```bash
# Check container resource usage
docker stats

# Limit container memory
# Add to docker-compose.yml:
mem_limit: 1g
```

#### Slow Database Queries
```bash
# Enable query logging
docker-compose exec postgres psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
docker-compose restart postgres
```

## Security Considerations

### Network Security
- Use internal Docker networks
- Expose only necessary ports
- Implement rate limiting in Nginx
- Use HTTPS in production

### Application Security
- Regular security updates
- Strong JWT secrets
- Input validation
- SQL injection protection
- XSS protection headers

### Data Security
- Encrypt sensitive data
- Regular backups
- Access logging
- User permission management

## Support

For deployment issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify configuration: `docker-compose config`
3. Check service health: `docker-compose ps`
4. Review this documentation
5. Contact the development team

## Appendix

### Useful Commands

```bash
# Complete cleanup
docker-compose down -v --remove-orphans
docker system prune -a

# Database shell access
docker-compose exec postgres psql -U postgres ecommerce_db

# Backend shell access
docker-compose exec backend sh

# View container resource usage
docker stats

# Export/Import Docker images
docker save -o images.tar $(docker-compose config --services)
docker load -i images.tar
```

### Directory Structure
```
.
├── backend/                 # NestJS backend application
├── frontend/               # Next.js frontend application
├── nginx/                  # Nginx configuration
├── docker-compose.yml      # Docker Compose configuration
├── .env.production         # Environment template
├── deploy.sh              # Linux/Mac deployment script
├── deploy.ps1             # Windows deployment script
└── DEPLOYMENT.md          # This documentation
```