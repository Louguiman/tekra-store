import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AlertType {
  FAILED_LOGIN = 'failed_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNUSUAL_PATTERN = 'unusual_pattern',
  SYSTEM_ANOMALY = 'system_anomaly',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
}

@Entity('security_alerts')
export class SecurityAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.OPEN,
  })
  status: AlertStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'affected_user_id' })
  affectedUser: User;

  @Column({ name: 'affected_user_id', nullable: true })
  affectedUserId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;
}