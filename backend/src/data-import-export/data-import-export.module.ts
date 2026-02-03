import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataImportExportController } from './data-import-export.controller';
import { DataImportExportService } from './data-import-export.service';
import { DataParsingService } from './services/data-parsing.service';
import { DataExportService } from './services/data-export.service';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductSpecification } from '../entities/product-specification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Order,
      Category,
      ProductSegmentEntity,
      Country,
      ProductPrice,
      ProductImage,
      ProductSpecification,
    ]),
  ],
  controllers: [DataImportExportController],
  providers: [
    DataImportExportService,
    DataParsingService,
    DataExportService,
  ],
  exports: [DataImportExportService],
})
export class DataImportExportModule {}