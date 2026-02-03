import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { RateLimiterService } from './rate-limiter.service';
import { MediaStorageService } from './media-storage.service';
import { MessageGroupingService } from './message-grouping.service';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierSubmission, ProcessingLog]),
    ConfigModule,
    SuppliersModule,
    AuditModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService, 
    RateLimiterService, 
    MediaStorageService, 
    MessageGroupingService
  ],
  exports: [WhatsappService, MediaStorageService, MessageGroupingService],
})
export class WhatsappModule {}