-- Initialize database with extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: This file is used for Docker initialization
-- The actual schema and seed data are managed through TypeORM migrations
-- This file only ensures required extensions are available

-- The following data will be inserted via migrations:
-- - Countries (Mali, Côte d'Ivoire, Burkina Faso)
-- - Product categories (Smartphones, Laptops, etc.)
-- - Product segments (Premium, Mid-range, Refurbished)
-- - User roles (Admin, Staff, Customer)