import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditAndSecurity1704312007000 implements MigrationInterface {
  name = 'AddAuditAndSecurity1704312007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "action" character varying NOT NULL,
        "resource" character varying NOT NULL,
        "resource_id" character varying,
        "severity" character varying NOT NULL DEFAULT 'low',
        "description" text,
        "metadata" jsonb,
        "ip_address" character varying,
        "user_agent" character varying,
        "session_id" character varying,
        "success" boolean NOT NULL DEFAULT true,
        "error_message" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create security_alerts table
    await queryRunner.query(`
      CREATE TABLE "security_alerts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL,
        "severity" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'open',
        "description" text NOT NULL,
        "details" jsonb,
        "affected_user_id" uuid,
        "ip_address" character varying,
        "user_agent" character varying,
        "resolved_by" character varying,
        "resolution_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMP,
        CONSTRAINT "PK_security_alerts" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "security_alerts" 
      ADD CONSTRAINT "FK_security_alerts_affected_user_id" 
      FOREIGN KEY ("affected_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_resource" ON "audit_logs" ("resource")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_success" ON "audit_logs" ("success")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_ip_address" ON "audit_logs" ("ip_address")`);

    await queryRunner.query(`CREATE INDEX "IDX_security_alerts_type" ON "security_alerts" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_alerts_severity" ON "security_alerts" ("severity")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_alerts_status" ON "security_alerts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_alerts_created_at" ON "security_alerts" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_security_alerts_affected_user_id" ON "security_alerts" ("affected_user_id")`);

    // Add check constraints for enum values
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "CHK_audit_logs_action" 
      CHECK ("action" IN ('create', 'update', 'delete', 'login', 'logout', 'access_denied', 'role_change', 'stock_adjustment', 'order_status_change', 'product_management', 'user_management', 'system_config'))
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "CHK_audit_logs_resource" 
      CHECK ("resource" IN ('user', 'product', 'order', 'inventory', 'payment', 'category', 'country', 'delivery', 'system', 'auth'))
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "CHK_audit_logs_severity" 
      CHECK ("severity" IN ('low', 'medium', 'high', 'critical'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_alerts" 
      ADD CONSTRAINT "CHK_security_alerts_type" 
      CHECK ("type" IN ('failed_login', 'suspicious_activity', 'unauthorized_access', 'data_breach_attempt', 'privilege_escalation', 'unusual_pattern', 'system_anomaly'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_alerts" 
      ADD CONSTRAINT "CHK_security_alerts_severity" 
      CHECK ("severity" IN ('low', 'medium', 'high', 'critical'))
    `);

    await queryRunner.query(`
      ALTER TABLE "security_alerts" 
      ADD CONSTRAINT "CHK_security_alerts_status" 
      CHECK ("status" IN ('open', 'investigating', 'resolved', 'false_positive'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "security_alerts" DROP CONSTRAINT "FK_security_alerts_affected_user_id"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "security_alerts"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}