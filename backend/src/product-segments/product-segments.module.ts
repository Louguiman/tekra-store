import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductSegmentsController } from './product-segments.controller';
import { ProductSegmentsService } from './product-segments.service';
import { ProductSegmentEntity } from '../entities/product-segment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductSegmentEntity])],
  controllers: [ProductSegmentsController],
  providers: [ProductSegmentsService],
  exports: [ProductSegmentsService],
})
export class ProductSegmentsModule {}