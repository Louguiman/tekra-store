import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierAutomation1704312008000 implements MigrationInterface {
  name = 'AddSupplierAutomation1704312008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create suppliers table
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "phone_number" character varying(20) NOT NULL,
        "country_code" character varying(2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "performance_metrics" jsonb,
        "preferred_categories" text array NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_suppliers_phone_number" UNIQUE ("phone_number")
      )
    `);

    // Create supplier_submissions table
    await queryRunner.query(`
      CREATE TABLE "supplier_submissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "supplier_id" uuid NOT NULL,
        "whatsapp_message_id" character varying NOT NULL,
        "content_type" character varying NOT NULL,
        "original_content" text NOT NULL,
        "media_url" character varying,
        "processing_status" character varying NOT NULL,
        "extracted_data" jsonb,
        "validation_status" character varying NOT NULL,
        "validated_by" character varying,
        "validation_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supplier_submissions_whatsapp_message_id" UNIQUE ("whatsapp_message_id")
      )
    `);

    // Create processing_logs table
    await queryRunner.query(`
      CREATE TABLE "processing_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL,
        "processing_stage" character varying NOT NULL,
        "processing_status" character varying NOT NULL,
        "processing_time_ms" integer NOT NULL,
        "error_message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_processing_logs" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "supplier_submissions" 
      ADD CONSTRAINT "FK_supplier_submissions_supplier_id" 
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "processing_logs" 
      ADD CONSTRAINT "FK_processing_logs_submission_id" 
      FOREIGN KEY ("submission_id") REFERENCES "supplier_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_suppliers_phone_number" ON "suppliers" ("phone_number")`);
    await queryRunner.query(`CREATE INDEX "IDX_suppliers_country_code" ON "suppliers" ("country_code")`);
    await queryRunner.query(`CREATE INDEX "IDX_suppliers_is_active" ON "suppliers" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_suppliers_created_at" ON "suppliers" ("created_at")`);

    await queryRunner.query(`CREATE INDEX "IDX_supplier_submissions_supplier_id" ON "supplier_submissions" ("supplier_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_supplier_submissions_processing_status" ON "supplier_submissions" ("processing_status")`);
    await queryRunner.query(`CREATE INDEX "IDX_supplier_submissions_validation_status" ON "supplier_submissions" ("validation_status")`);
    await queryRunner.query(`CREATE INDEX "IDX_supplier_submissions_content_type" ON "supplier_submissions" ("content_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_supplier_submissions_created_at" ON "supplier_submissions" ("created_at")`);

    await queryRunner.query(`CREATE INDEX "IDX_processing_logs_submission_id" ON "processing_logs" ("submission_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_processing_logs_processing_stage" ON "processing_logs" ("processing_stage")`);
    await queryRunner.query(`CREATE INDEX "IDX_processing_logs_processing_status" ON "processing_logs" ("processing_status")`);
    await queryRunner.query(`CREATE INDEX "IDX_processing_logs_created_at" ON "processing_logs" ("created_at")`);

    // Add check constraints for enum values
    await queryRunner.query(`
      ALTER TABLE "supplier_submissions" 
      ADD CONSTRAINT "CHK_supplier_submissions_content_type" 
      CHECK ("content_type" IN ('text', 'image', 'pdf', 'voice'))
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_submissions" 
      ADD CONSTRAINT "CHK_supplier_submissions_processing_status" 
      CHECK ("processing_status" IN ('pending', 'processing', 'completed', 'failed'))
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_submissions" 
      ADD CONSTRAINT "CHK_supplier_submissions_validation_status" 
      CHECK ("validation_status" IN ('pending', 'approved', 'rejected'))
    `);

    await queryRunner.query(`
      ALTER TABLE "processing_logs" 
      ADD CONSTRAINT "CHK_processing_logs_processing_stage" 
      CHECK ("processing_stage" IN ('webhook', 'ai_extraction', 'validation', 'inventory_update'))
    `);

    await queryRunner.query(`
      ALTER TABLE "processing_logs" 
      ADD CONSTRAINT "CHK_processing_logs_processing_status" 
      CHECK ("processing_status" IN ('started', 'completed', 'failed'))
    `);

    // Update audit_logs constraints to include new actions and resources (only if table exists)
    const auditLogsExists = await queryRunner.hasTable('audit_logs');
    
    if (auditLogsExists) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        DROP CONSTRAINT "CHK_audit_logs_action"
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "CHK_audit_logs_action" 
        CHECK ("action" IN ('create', 'update', 'delete', 'login', 'logout', 'access_denied', 'role_change', 'stock_adjustment', 'order_status_change', 'product_management', 'user_management', 'system_config', 'supplier_registration', 'supplier_submission', 'ai_processing', 'human_validation', 'inventory_integration'))
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        DROP CONSTRAINT "CHK_audit_logs_resource"
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "CHK_audit_logs_resource" 
        CHECK ("resource" IN ('user', 'product', 'order', 'inventory', 'payment', 'category', 'country', 'delivery', 'system', 'auth', 'supplier', 'supplier_submission'))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert audit_logs constraints (only if table exists)
    const auditLogsExists = await queryRunner.hasTable('audit_logs');
    
    if (auditLogsExists) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        DROP CONSTRAINT "CHK_audit_logs_action"
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "CHK_audit_logs_action" 
        CHECK ("action" IN ('create', 'update', 'delete', 'login', 'logout', 'access_denied', 'role_change', 'stock_adjustment', 'order_status_change', 'product_management', 'user_management', 'system_config'))
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        DROP CONSTRAINT "CHK_audit_logs_resource"
      `);

      await queryRunner.query(`
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "CHK_audit_logs_resource" 
        CHECK ("resource" IN ('user', 'product', 'order', 'inventory', 'payment', 'category', 'country', 'delivery', 'system', 'auth'))
      `);
    }

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "processing_logs" DROP CONSTRAINT "FK_processing_logs_submission_id"`);
    await queryRunner.query(`ALTER TABLE "supplier_submissions" DROP CONSTRAINT "FK_supplier_submissions_supplier_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "processing_logs"`);
    await queryRunner.query(`DROP TABLE "supplier_submissions"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}