import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';
import { ProductPrice } from './product-price.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 2 })
  code: string; // ML, CI, BF

  @Column({ length: 100 })
  name: string;

  @Column({ length: 10, default: 'FCFA' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.country)
  orders: Order[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.country)
  productPrices: ProductPrice[];
}