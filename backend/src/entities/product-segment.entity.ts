import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';

export enum ProductSegment {
  PREMIUM = 'premium',
  MID_RANGE = 'mid_range',
  REFURBISHED = 'refurbished',
}

@Entity('product_segments')
export class ProductSegmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ProductSegment,
    unique: true,
  })
  name: ProductSegment;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.segment)
  products: Product[];
}