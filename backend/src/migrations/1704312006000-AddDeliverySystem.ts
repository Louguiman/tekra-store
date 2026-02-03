import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliverySystem1704312006000 implements MigrationInterface {
  name = 'AddDeliverySystem1704312006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create delivery_methods table
    await queryRunner.query(`
      CREATE TABLE "delivery_methods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "type" character varying NOT NULL,
        "base_fee" numeric(10,2) NOT NULL,
        "estimated_days_min" integer NOT NULL,
        "estimated_days_max" integer NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "country_id" uuid,
        CONSTRAINT "PK_delivery_methods" PRIMARY KEY ("id")
      )
    `);

    // Create pickup_points table
    await queryRunner.query(`
      CREATE TABLE "pickup_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "address" text NOT NULL,
        "city" character varying(50) NOT NULL,
        "phone" character varying(20),
        "instructions" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "country_id" uuid,
        CONSTRAINT "PK_pickup_points" PRIMARY KEY ("id")
      )
    `);

    // Create delivery_tracking table
    await queryRunner.query(`
      CREATE TABLE "delivery_tracking" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tracking_number" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'preparing',
        "estimated_delivery_date" date,
        "actual_delivery_date" date,
        "delivery_notes" text,
        "carrier_name" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "order_id" uuid,
        CONSTRAINT "UQ_delivery_tracking_tracking_number" UNIQUE ("tracking_number"),
        CONSTRAINT "PK_delivery_tracking" PRIMARY KEY ("id")
      )
    `);

    // Add delivery-related columns to orders table
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD COLUMN "delivery_method_id" uuid,
      ADD COLUMN "pickup_point_id" uuid
    `);

    // Create foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "delivery_methods" 
      ADD CONSTRAINT "FK_delivery_methods_country" 
      FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "pickup_points" 
      ADD CONSTRAINT "FK_pickup_points_country" 
      FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_tracking" 
      ADD CONSTRAINT "FK_delivery_tracking_order" 
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD CONSTRAINT "FK_orders_delivery_method" 
      FOREIGN KEY ("delivery_method_id") REFERENCES "delivery_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD CONSTRAINT "FK_orders_pickup_point" 
      FOREIGN KEY ("pickup_point_id") REFERENCES "pickup_points"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_delivery_methods_country" ON "delivery_methods" ("country_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pickup_points_country" ON "pickup_points" ("country_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delivery_tracking_order" ON "delivery_tracking" ("order_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_pickup_point"
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_delivery_method"
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_tracking" DROP CONSTRAINT "FK_delivery_tracking_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "pickup_points" DROP CONSTRAINT "FK_pickup_points_country"
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_methods" DROP CONSTRAINT "FK_delivery_methods_country"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_delivery_tracking_order"`);
    await queryRunner.query(`DROP INDEX "IDX_pickup_points_country"`);
    await queryRunner.query(`DROP INDEX "IDX_delivery_methods_country"`);

    // Remove columns from orders table
    await queryRunner.query(`
      ALTER TABLE "orders" 
      DROP COLUMN "pickup_point_id",
      DROP COLUMN "delivery_method_id"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "delivery_tracking"`);
    await queryRunner.query(`DROP TABLE "pickup_points"`);
    await queryRunner.query(`DROP TABLE "delivery_methods"`);
  }
}