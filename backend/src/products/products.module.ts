import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductPrice,
      ProductSpecification,
      Category,
      ProductSegmentEntity,
      Country,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}