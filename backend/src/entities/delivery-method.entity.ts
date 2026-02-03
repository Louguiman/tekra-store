import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Country } from './country.entity';

export enum DeliveryType {
  OWN_DELIVERY = 'own_delivery',
  PARTNER_LOGISTICS = 'partner_logistics',
}

@Entity('delivery_methods')
export class DeliveryMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: DeliveryType,
  })
  type: DeliveryType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseFee: number;

  @Column({ name: 'estimated_days_min', type: 'int' })
  estimatedDaysMin: number;

  @Column({ name: 'estimated_days_max', type: 'int' })
  estimatedDaysMax: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'country_id' })
  country: Country;
}