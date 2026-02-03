import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCountries1704312001000 implements MigrationInterface {
  name = 'SeedCountries1704312001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert initial country data for Mali, Côte d'Ivoire, and Burkina Faso
    await queryRunner.query(`
      INSERT INTO "countries" ("code", "name", "currency") VALUES
      ('ML', 'Mali', 'FCFA'),
      ('CI', 'Côte d''Ivoire', 'FCFA'),
      ('BF', 'Burkina Faso', 'FCFA')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded countries
    await queryRunner.query(`
      DELETE FROM "countries" WHERE "code" IN ('ML', 'CI', 'BF')
    `);
  }
}