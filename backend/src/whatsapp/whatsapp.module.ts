import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { RateLimiterService } from './rate-limiter.service';
import { MediaStorageService } from './media-storage.service';
import { MessageGroupingService } from './message-grouping.service';
import { SecurityProcessingService } from './security-processing.service';
import { ErrorRecoveryService } from './error-recovery.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { ErrorRecoverySchedulerService } from './error-recovery-scheduler.service';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AuditModule } from '../audit/audit.module';
import { AIProcessingModule } from '../ai-processing/ai-processing.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierSubmission, ProcessingLog]),
    ConfigModule,
    ScheduleModule.forRoot(),
    SuppliersModule,
    AuditModule,
    AIProcessingModule,
    forwardRef(() => AdminModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService, 
    RateLimiterService, 
    MediaStorageService, 
    MessageGroupingService,
    SecurityProcessingService,
    ErrorRecoveryService,
    HealthMonitoringService,
    ErrorRecoverySchedulerService,
    PipelineOrchestratorService,
  ],
  exports: [
    WhatsappService, 
    MediaStorageService, 
    MessageGroupingService, 
    SecurityProcessingService,
    ErrorRecoveryService,
    HealthMonitoringService,
    PipelineOrchestratorService,
  ],
})
export class WhatsappModule {}