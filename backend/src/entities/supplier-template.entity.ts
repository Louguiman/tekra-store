import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

export enum TemplateType {
  TEXT = 'text',
  IMAGE = 'image',
  PDF = 'pdf',
  MIXED = 'mixed',
}

export enum TemplateCategory {
  ELECTRONICS = 'electronics',
  COMPUTERS = 'computers',
  PHONES = 'phones',
  ACCESSORIES = 'accessories',
  GENERAL = 'general',
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiline';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface TemplateUsageStats {
  totalUsages: number;
  successfulSubmissions: number;
  averageConfidenceScore: number;
  lastUsedDate: Date;
  commonErrors: Array<{ field: string; errorType: string; count: number }>;
}

@Entity('supplier_templates')
export class SupplierTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.TEXT,
  })
  type: TemplateType;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.GENERAL,
  })
  category: TemplateCategory;

  @Column({ type: 'jsonb' })
  fields: TemplateField[];

  @Column({ type: 'text' })
  exampleContent: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_global', default: true })
  isGlobal: boolean;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'jsonb', nullable: true })
  usageStats: TemplateUsageStats;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'version', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
