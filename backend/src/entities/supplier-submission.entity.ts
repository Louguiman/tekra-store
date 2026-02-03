import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { ProcessingLog } from './processing-log.entity';

export interface ExtractedProduct {
  name: string;
  brand?: string;
  category?: string;
  condition?: string;
  grade?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  specifications?: Record<string, string>;
  confidenceScore: number;
  extractionMetadata: {
    sourceType: 'text' | 'image' | 'pdf' | 'voice';
    processingTime: number;
    aiModel: string;
    extractedFields: string[];
  };
}

@Entity('supplier_submissions')
export class SupplierSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Supplier, supplier => supplier.submissions)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'whatsapp_message_id', unique: true })
  whatsappMessageId: string;

  @Column({ name: 'content_type' })
  contentType: 'text' | 'image' | 'pdf' | 'voice';

  @Column({ type: 'text' })
  originalContent: string;

  @Column({ name: 'media_url', nullable: true })
  mediaUrl: string;

  @Column({ name: 'processing_status' })
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  extractedData: ExtractedProduct[];

  @Column({ name: 'validation_status' })
  validationStatus: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'validated_by', nullable: true })
  validatedBy: string;

  @Column({ name: 'validation_notes', type: 'text', nullable: true })
  validationNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProcessingLog, log => log.submission)
  processingLogs: ProcessingLog[];
}