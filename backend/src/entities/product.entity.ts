import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { ProductSegmentEntity } from './product-segment.entity';
import { ProductPrice } from './product-price.entity';
import { ProductImage } from './product-image.entity';
import { ProductSpecification } from './product-specification.entity';
import { InventoryItem } from './inventory-item.entity';
import { OrderItem } from './order-item.entity';

export enum RefurbishedGrade {
  A = 'A',
  B = 'B',
  C = 'C',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ name: 'is_refurbished', default: false })
  isRefurbished: boolean;

  @Column({
    name: 'refurbished_grade',
    type: 'enum',
    enum: RefurbishedGrade,
    nullable: true,
  })
  refurbishedGrade: RefurbishedGrade;

  @Column({ name: 'warranty_months', default: 0 })
  warrantyMonths: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => ProductSegmentEntity, (segment) => segment.products)
  @JoinColumn({ name: 'segment_id' })
  segment: ProductSegmentEntity;

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.product)
  prices: ProductPrice[];

  @OneToMany(() => ProductImage, (productImage) => productImage.product)
  images: ProductImage[];

  @OneToMany(() => ProductSpecification, (spec) => spec.product)
  specifications: ProductSpecification[];

  @OneToMany(() => InventoryItem, (inventory) => inventory.product)
  inventory: InventoryItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];
}