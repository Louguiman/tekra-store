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

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-platform
   ```

2. **Start the database services**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run migration:run
   npm run start:dev
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=ecommerce_db
JWT_SECRET=your-jwt-secret
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── entities/       # TypeORM entities
│   │   ├── modules/        # Feature modules
│   │   ├── config/         # Configuration files
│   │   └── migrations/     # Database migrations
│   └── package.json
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── store/         # Redux store
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker-compose.yml      # Docker services
└── README.md
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/health

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm run test

# Frontend tests  
cd frontend
npm run test
```

### Database Migrations
```bash
cd backend
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check
```

## Deployment

### Production Build
```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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