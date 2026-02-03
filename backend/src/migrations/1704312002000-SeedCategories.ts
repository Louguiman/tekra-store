import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCategories1704312002000 implements MigrationInterface {
  name = 'SeedCategories1704312002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert initial product categories
    await queryRunner.query(`
      INSERT INTO "categories" ("name", "slug", "description") VALUES
      ('Smartphones', 'smartphones', 'Mobile phones and accessories'),
      ('Laptops', 'laptops', 'Portable computers and laptops'),
      ('Tablets', 'tablets', 'Tablet computers and e-readers'),
      ('Gaming', 'gaming', 'Gaming consoles, accessories, and peripherals'),
      ('Audio', 'audio', 'Headphones, speakers, and audio equipment'),
      ('Accessories', 'accessories', 'Phone cases, chargers, and other accessories'),
      ('Computers', 'computers', 'Desktop computers and components'),
      ('Monitors', 'monitors', 'Computer monitors and displays'),
      ('Storage', 'storage', 'Hard drives, SSDs, and storage devices'),
      ('Networking', 'networking', 'Routers, modems, and networking equipment')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded categories
    await queryRunner.query(`
      DELETE FROM "categories" WHERE "slug" IN (
        'smartphones', 'laptops', 'tablets', 'gaming', 'audio', 
        'accessories', 'computers', 'monitors', 'storage', 'networking'
      )
    `);
  }
}