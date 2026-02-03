import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Country } from './country.entity';

@Entity('product_prices')
@Unique(['product', 'country'])
export class ProductPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'promo_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  promoPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.prices)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Country, (country) => country.productPrices)
  @JoinColumn({ name: 'country_id' })
  country: Country;
}