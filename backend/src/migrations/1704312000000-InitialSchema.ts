import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704312000000 implements MigrationInterface {
  name = 'InitialSchema1704312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create countries table
    await queryRunner.query(`
      CREATE TABLE "countries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(2) NOT NULL,
        "name" character varying(100) NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'FCFA',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_countries_code" UNIQUE ("code"),
        CONSTRAINT "PK_countries" PRIMARY KEY ("id")
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(50) NOT NULL,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM('admin', 'staff', 'customer');
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "full_name" character varying(255) NOT NULL,
        "email" character varying,
        "phone" character varying(20) NOT NULL,
        "password_hash" character varying,
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "country_code" character varying(2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Create product_segments table
    await queryRunner.query(`
      CREATE TYPE "product_segments_name_enum" AS ENUM('premium', 'mid_range', 'refurbished');
      CREATE TABLE "product_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" "product_segments_name_enum" NOT NULL,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_segments_name" UNIQUE ("name"),
        CONSTRAINT "PK_product_segments" PRIMARY KEY ("id")
      )
    `);

    // Create products table
    await queryRunner.query(`
      CREATE TYPE "products_refurbished_grade_enum" AS ENUM('A', 'B', 'C');
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "description" text,
        "brand" character varying(100),
        "is_refurbished" boolean NOT NULL DEFAULT false,
        "refurbished_grade" "products_refurbished_grade_enum",
        "warranty_months" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "category_id" uuid,
        "segment_id" uuid,
        CONSTRAINT "UQ_products_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    // Create product_prices table
    await queryRunner.query(`
      CREATE TABLE "product_prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "price" numeric(10,2) NOT NULL,
        "promo_price" numeric(10,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" uuid,
        "country_id" uuid,
        CONSTRAINT "PK_product_prices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_prices_product_country" UNIQUE ("product_id", "country_id")
      )
    `);

    // Create product_images table
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "url" character varying(500) NOT NULL,
        "alt_text" character varying(255),
        "is_primary" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" uuid,
        CONSTRAINT "PK_product_images" PRIMARY KEY ("id")
      )
    `);

    // Create product_specifications table
    await queryRunner.query(`
      CREATE TABLE "product_specifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "value" character varying(500) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" uuid,
        CONSTRAINT "PK_product_specifications" PRIMARY KEY ("id")
      )
    `);

    // Create inventory_items table
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quantity" integer NOT NULL DEFAULT 0,
        "warehouse_location" character varying(100),
        "supplier_id" character varying,
        "low_stock_threshold" integer NOT NULL DEFAULT 10,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" uuid,
        CONSTRAINT "PK_inventory_items" PRIMARY KEY ("id")
      )
    `);

    // Create orders table
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled');
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_number" character varying NOT NULL,
        "status" "orders_status_enum" NOT NULL DEFAULT 'pending',
        "total_amount" numeric(10,2) NOT NULL,
        "delivery_fee" numeric(10,2) NOT NULL DEFAULT 0,
        "delivery_address" json NOT NULL,
        "customer_email" character varying,
        "customer_phone" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid,
        "country_id" uuid,
        CONSTRAINT "UQ_orders_order_number" UNIQUE ("order_number"),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    // Create order_items table
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "order_id" uuid,
        "product_id" uuid,
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
      )
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TYPE "payments_method_enum" AS ENUM('orange_money', 'wave', 'moov', 'card');
      CREATE TYPE "payments_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "transaction_ref" character varying NOT NULL,
        "method" "payments_method_enum" NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "amount" numeric(10,2) NOT NULL,
        "provider_response" json,
        "failure_reason" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "order_id" uuid,
        CONSTRAINT "UQ_payments_transaction_ref" UNIQUE ("transaction_ref"),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" 
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "products" ADD CONSTRAINT "FK_products_segment" 
      FOREIGN KEY ("segment_id") REFERENCES "product_segments"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_prices" ADD CONSTRAINT "FK_product_prices_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_prices" ADD CONSTRAINT "FK_product_prices_country" 
      FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_images" ADD CONSTRAINT "FK_product_images_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_specifications" ADD CONSTRAINT "FK_product_specifications_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_inventory_items_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_country" 
      FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" 
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_order" 
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_segment" ON "products" ("segment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_brand" ON "products" ("brand")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_refurbished" ON "products" ("is_refurbished")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_country" ON "orders" ("country_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_user" ON "orders" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_method" ON "payments" ("method")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_order"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_product"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_country"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_inventory_items_product"`);
    await queryRunner.query(`ALTER TABLE "product_specifications" DROP CONSTRAINT "FK_product_specifications_product"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_product_images_product"`);
    await queryRunner.query(`ALTER TABLE "product_prices" DROP CONSTRAINT "FK_product_prices_country"`);
    await queryRunner.query(`ALTER TABLE "product_prices" DROP CONSTRAINT "FK_product_prices_product"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_segment"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_category"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_payments_method"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_user"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_country"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX "IDX_products_refurbished"`);
    await queryRunner.query(`DROP INDEX "IDX_products_brand"`);
    await queryRunner.query(`DROP INDEX "IDX_products_segment"`);
    await queryRunner.query(`DROP INDEX "IDX_products_category"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "inventory_items"`);
    await queryRunner.query(`DROP TABLE "product_specifications"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
    await queryRunner.query(`DROP TABLE "product_prices"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "product_segments"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "countries"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "payments_method_enum"`);
    await queryRunner.query(`DROP TYPE "orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "products_refurbished_grade_enum"`);
    await queryRunner.query(`DROP TYPE "product_segments_name_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}