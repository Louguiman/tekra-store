import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1704312004000 implements MigrationInterface {
  name = 'SeedRoles1704312004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert initial roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description") VALUES
      ('admin', 'Full system administrator with all permissions'),
      ('staff', 'Staff member with limited administrative permissions'),
      ('customer', 'Regular customer with basic user permissions')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded roles
    await queryRunner.query(`
      DELETE FROM "roles" WHERE "name" IN ('admin', 'staff', 'customer')
    `);
  }
}