import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIProcessingService } from './ai-processing.service';
import { RuleBasedExtractionService } from './rule-based-extraction.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { Product } from '../entities/product.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Product]),
  ],
  providers: [AIProcessingService, RuleBasedExtractionService, DuplicateDetectionService],
  exports: [AIProcessingService],
})
export class AIProcessingModule {}