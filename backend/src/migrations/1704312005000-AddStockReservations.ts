import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockReservations1704312005000 implements MigrationInterface {
  name = 'AddStockReservations1704312005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stock_reservations table
    await queryRunner.query(`
      CREATE TABLE "stock_reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quantity" integer NOT NULL,
        "reservation_reference" character varying,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" uuid NOT NULL,
        CONSTRAINT "PK_stock_reservations" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "stock_reservations" ADD CONSTRAINT "FK_stock_reservations_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_stock_reservations_product" ON "stock_reservations" ("product_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_stock_reservations_expires_at" ON "stock_reservations" ("expires_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_stock_reservations_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_reservations_product"`);

    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "stock_reservations" DROP CONSTRAINT "FK_stock_reservations_product"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "stock_reservations"`);
  }
}