# Database Setup Guide

This document explains how to set up and manage the database for the West Africa E-commerce Platform.

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed
- PostgreSQL client (optional, for direct database access)

## Database Schema

The database consists of the following core entities:

### Core Tables
- **countries**: Mali, Côte d'Ivoire, Burkina Faso
- **users**: Customer and admin accounts
- **roles**: User role definitions
- **categories**: Product categories (Smartphones, Laptops, etc.)
- **product_segments**: Premium, Mid-range, Refurbished
- **products**: Product catalog with specifications
- **product_prices**: Country-specific pricing
- **product_images**: Product image management
- **product_specifications**: Technical specifications
- **inventory_items**: Stock management
- **orders**: Order processing
- **order_items**: Order line items
- **payments**: Payment processing

## Setup Instructions

### 1. Start the Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d postgres

# Verify the database is running
docker-compose ps
```

### 2. Run Migrations

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migration:run
```

### 3. Seed Initial Data

```bash
# Run the database seeder
npm run seed
```

This will populate the database with:
- Countries: Mali (ML), Côte d'Ivoire (CI), Burkina Faso (BF)
- Product categories: Smartphones, Laptops, Tablets, Gaming, etc.
- Product segments: Premium, Mid-range, Refurbished
- User roles: Admin, Staff, Customer

## Migration Management

### Generate New Migration

```bash
# Generate migration based on entity changes
npm run migration:generate -- src/migrations/MigrationName
```

### Run Migrations

```bash
# Run all pending migrations
npm run migration:run
```

### Revert Migration

```bash
# Revert the last migration
npm run migration:revert
```

## Database Connection

The application connects to PostgreSQL using the following configuration:

- **Host**: localhost (configurable via DB_HOST)
- **Port**: 5432 (configurable via DB_PORT)
- **Database**: ecommerce_db (configurable via DB_NAME)
- **Username**: postgres (configurable via DB_USERNAME)
- **Password**: password (configurable via DB_PASSWORD)

## Environment Variables

Create a `.env` file in the backend directory with:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=ecommerce_db
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running
2. Check if PostgreSQL container is running: `docker-compose ps`
3. Verify environment variables in `.env` file
4. Check database logs: `docker-compose logs postgres`

### Migration Issues

1. Ensure database is running and accessible
2. Check migration files in `src/migrations/`
3. Verify entity definitions match migration schema
4. Use `npm run migration:revert` to undo problematic migrations

### Seeding Issues

1. Ensure migrations have been run first
2. Check for duplicate data constraints
3. Verify entity relationships are properly defined
4. Review seeder logs for specific error messages

## Development Workflow

1. Make changes to entity files
2. Generate migration: `npm run migration:generate -- src/migrations/UpdateName`
3. Review generated migration file
4. Run migration: `npm run migration:run`
5. Test changes with seeded data

## Production Considerations

- Set `synchronize: false` in production (already configured)
- Use proper database credentials
- Enable SSL connections
- Set up database backups
- Monitor database performance
- Use connection pooling for high traffic

## Schema Validation

The database schema includes:

- **Primary Keys**: UUID for all entities
- **Foreign Keys**: Proper relationships between entities
- **Constraints**: Unique constraints on codes, slugs, emails
- **Indexes**: Performance indexes on frequently queried columns
- **Enums**: Type-safe enums for status fields and categories

## Data Integrity

- Cascade deletes for dependent data (images, specifications, order items)
- Restrict deletes for referenced data (products in orders)
- Unique constraints prevent duplicate entries
- Check constraints ensure data validity
- Foreign key constraints maintain referential integrity