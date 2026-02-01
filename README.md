# West Africa E-commerce Platform

A modern e-commerce platform designed specifically for West African markets (Mali, Côte d'Ivoire, and Burkina Faso) with local payment methods and delivery options.

## Features

- 🌍 Multi-country support (Mali, CI, Burkina Faso)
- 💳 Local payment methods (Orange Money, Wave, Moov, Cards)
- 📱 Mobile-first responsive design
- 🛒 Guest and registered user checkout
- 📦 Country-specific delivery options
- 🔧 Refurbished product grading system
- 📊 Admin dashboard with analytics
- 🔒 Role-based access control

## Tech Stack

### Backend
- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with TypeORM
- **Authentication:** JWT with role-based access
- **API Documentation:** Swagger/OpenAPI

### Frontend
- **Framework:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Forms:** React Hook Form with Zod validation

### Infrastructure
- **Database:** PostgreSQL
- **Caching:** Redis
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx

## Quick Start (Docker)

### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose v2.0+
- 4GB+ RAM available

### 1. Clone and Deploy
```bash
git clone <repository-url>
cd west-africa-ecommerce

# Automated deployment
./deploy.sh          # Linux/Mac
# or
.\deploy.ps1         # Windows PowerShell

# Manual deployment
make deploy          # Using Makefile
```

### 2. Access the Platform
- **Frontend:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **Backend API:** http://localhost:3001/api
- **API Docs:** http://localhost:3001/api/docs

## Development Setup

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd west-africa-ecommerce

# Start database services
docker-compose up -d postgres redis
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migration:run
npm run seed
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

## Deployment

### Quick Deployment Commands

```bash
# Development deployment
make deploy

# Production deployment  
make deploy-prod

# View service status
make status

# View logs
make logs

# Stop services
make stop
```

### Manual Docker Commands

```bash
# Build and start all services
docker-compose build
docker-compose up -d

# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec backend npm run migration:run
docker-compose exec backend npm run seed
```

### Environment Configuration

Create `.env` file in root directory:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key

# Payment Provider API Keys
ORANGE_MONEY_API_KEY=your-orange-money-api-key
WAVE_API_KEY=your-wave-api-key
MOOV_API_KEY=your-moov-api-key
CARD_PAYMENT_API_KEY=your-card-payment-api-key

# Database (optional - uses Docker defaults)
DB_PASSWORD=your-secure-db-password
```

## Project Structure

```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── entities/       # TypeORM entities
│   │   ├── modules/        # Feature modules
│   │   ├── config/         # Configuration files
│   │   └── migrations/     # Database migrations
│   ├── Dockerfile          # Backend container config
│   └── package.json
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── store/         # Redux store
│   │   └── types/         # TypeScript types
│   ├── Dockerfile          # Frontend container config
│   └── package.json
├── nginx/                  # Nginx configuration
│   └── nginx.conf         # Reverse proxy config
├── docker-compose.yml      # Main Docker services
├── docker-compose.prod.yml # Production overrides
├── deploy.sh              # Linux/Mac deployment script
├── deploy.ps1             # Windows deployment script
├── Makefile               # Development commands
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md
```

## Service Architecture

```
Internet → Nginx (80/443) → Frontend (3000) / Backend (3001)
                          ↓
                     PostgreSQL (5432) + Redis (6379)
```

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Using Makefile
make test
```

### Database Operations
```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Database shell
make db-shell

# Reset database
make db-reset
```

### Monitoring and Maintenance

```bash
# View service status
make status

# View logs
make logs

# Create backup
make backup

# Clean up containers
make clean
```

## Production Deployment

### Security Checklist
- [ ] Change default database passwords
- [ ] Set strong JWT secrets
- [ ] Configure SSL certificates
- [ ] Set up proper firewall rules
- [ ] Configure payment provider API keys
- [ ] Enable HTTPS in Nginx
- [ ] Set up monitoring and logging

### Performance Optimization
- [ ] Configure resource limits
- [ ] Set up horizontal scaling
- [ ] Enable database connection pooling
- [ ] Configure CDN for static assets
- [ ] Set up load balancing

### Monitoring
- [ ] Health check endpoints
- [ ] Application logs
- [ ] Database performance
- [ ] Resource usage monitoring
- [ ] Error tracking

## API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:3001/api/docs
- **Health Check:** http://localhost:3001/api/health

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop service-name
```

**Database connection issues:**
```bash
# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d ecommerce_db -c "SELECT 1;"
```

**Service won't start:**
```bash
# Check service logs
docker-compose logs service-name

# Restart specific service
docker-compose restart service-name
```

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@westtech.com or contact us on WhatsApp.

## Countries Supported

- 🇲🇱 **Mali** - Own delivery team in major cities
- 🇨🇮 **Côte d'Ivoire** - Partner logistics with pickup points  
- 🇧🇫 **Burkina Faso** - Partner logistics with pickup points

## Payment Methods

- **Mobile Money:** Orange Money, Wave, Moov
- **Cards:** Visa, MasterCard
- **Currency:** West African CFA Franc (FCFA)