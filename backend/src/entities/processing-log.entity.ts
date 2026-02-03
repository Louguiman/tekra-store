import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierSubmission } from './supplier-submission.entity';

@Entity('processing_logs')
export class ProcessingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SupplierSubmission, submission => submission.processingLogs)
  @JoinColumn({ name: 'submission_id' })
  submission: SupplierSubmission;

  @Column({ name: 'processing_stage' })
  processingStage: 'webhook' | 'ai_extraction' | 'validation' | 'inventory_update';

  @Column({ name: 'processing_status' })
  processingStatus: 'started' | 'completed' | 'failed';

  @Column({ name: 'processing_time_ms' })
  processingTimeMs: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}