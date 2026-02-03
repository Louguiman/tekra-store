import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DatabaseSeeder } from './database.seeder';

// Import all entities
import { User } from '../entities/user.entity';
import { Country } from '../entities/country.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { Role } from '../entities/role.entity';

async function runSeeder() {
  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ecommerce_db',
    entities: [
      User,
      Country,
      Category,
      ProductSegmentEntity,
      Product,
      ProductPrice,
      ProductImage,
      ProductSpecification,
      InventoryItem,
      Order,
      OrderItem,
      Payment,
      Role,
    ],
    synchronize: false,
    logging: true,
  });

  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection established');

    // Run the seeder
    const seeder = new DatabaseSeeder(dataSource);
    await seeder.run();

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run the seeder
runSeeder();