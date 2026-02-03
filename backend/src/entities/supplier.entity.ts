import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupplierSubmission } from './supplier-submission.entity';

export interface SupplierMetrics {
  totalSubmissions: number;
  approvedSubmissions: number;
  averageConfidenceScore: number;
  averageProcessingTime: number;
  lastSubmissionDate: Date;
  qualityRating: number; // 1-5 scale
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'phone_number', unique: true, length: 20 })
  phoneNumber: string;

  @Column({ name: 'country_code', length: 2 })
  countryCode: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: SupplierMetrics;

  @Column({ name: 'preferred_categories', type: 'text', array: true, default: [] })
  preferredCategories: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SupplierSubmission, submission => submission.supplier)
  submissions: SupplierSubmission[];
}