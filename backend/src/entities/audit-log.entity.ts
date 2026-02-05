import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS_DENIED = 'access_denied',
  ROLE_CHANGE = 'role_change',
  STOCK_ADJUSTMENT = 'stock_adjustment',
  ORDER_STATUS_CHANGE = 'order_status_change',
  PRODUCT_MANAGEMENT = 'product_management',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_CONFIG = 'system_config',
  SUPPLIER_REGISTRATION = 'supplier_registration',
  SUPPLIER_SUBMISSION = 'supplier_submission',
  AI_PROCESSING = 'ai_processing',
  HUMAN_VALIDATION = 'human_validation',
  INVENTORY_INTEGRATION = 'inventory_integration',
  APPROVE = 'approve',
  REJECT = 'reject',
  BULK_APPROVE = 'bulk_approve',
  BULK_REJECT = 'bulk_reject',
}

export enum AuditResource {
  USER = 'user',
  PRODUCT = 'product',
  ORDER = 'order',
  INVENTORY = 'inventory',
  PAYMENT = 'payment',
  CATEGORY = 'category',
  COUNTRY = 'country',
  DELIVERY = 'delivery',
  SYSTEM = 'system',
  AUTH = 'auth',
  SUPPLIER = 'supplier',
  SUPPLIER_SUBMISSION = 'supplier_submission',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
  })
  resource: AuditResource;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  severity: AuditSeverity;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}