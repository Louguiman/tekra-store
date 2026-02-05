import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierTemplate } from './supplier-template.entity';
import { SupplierSubmission } from './supplier-submission.entity';
import { Supplier } from './supplier.entity';

export enum SubmissionResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
}

export interface FieldValidationError {
  field: string;
  errorType: 'missing' | 'invalid_format' | 'out_of_range' | 'invalid_value';
  message: string;
  expectedFormat?: string;
  actualValue?: string;
}

@Entity('template_submissions')
export class TemplateSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SupplierTemplate)
  @JoinColumn({ name: 'template_id' })
  template: SupplierTemplate;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => SupplierSubmission, { nullable: true })
  @JoinColumn({ name: 'submission_id' })
  submission: SupplierSubmission;

  @Column({
    type: 'enum',
    enum: SubmissionResult,
  })
  result: SubmissionResult;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2 })
  confidenceScore: number;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors: FieldValidationError[];

  @Column({ type: 'jsonb', nullable: true })
  extractedData: Record<string, any>;

  @Column({ name: 'processing_time_ms', type: 'int' })
  processingTimeMs: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
