import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProductSegments1704312003000 implements MigrationInterface {
  name = 'SeedProductSegments1704312003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert initial product segments
    await queryRunner.query(`
      INSERT INTO "product_segments" ("name", "description") VALUES
      ('premium', 'High-end premium products and gaming equipment'),
      ('mid_range', 'Mid-range products offering good value for money'),
      ('refurbished', 'Refurbished products with quality grades A, B, or C')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded product segments
    await queryRunner.query(`
      DELETE FROM "product_segments" WHERE "name" IN ('premium', 'mid_range', 'refurbished')
    `);
  }
}