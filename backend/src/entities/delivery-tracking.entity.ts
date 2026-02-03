import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum DeliveryStatus {
  PREPARING = 'preparing',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED_DELIVERY = 'failed_delivery',
}

@Entity('delivery_tracking')
export class DeliveryTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tracking_number', unique: true })
  trackingNumber: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PREPARING,
  })
  status: DeliveryStatus;

  @Column({ name: 'estimated_delivery_date', type: 'date', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ name: 'actual_delivery_date', type: 'date', nullable: true })
  actualDeliveryDate: Date;

  @Column({ name: 'delivery_notes', type: 'text', nullable: true })
  deliveryNotes: string;

  @Column({ name: 'carrier_name', length: 100, nullable: true })
  carrierName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}