import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { TemplateService } from './template.service';
import { TemplateNotificationService } from './template-notification.service';
import { TemplateImprovementService } from './template-improvement.service';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SupplierTemplate } from '../entities/supplier-template.entity';
import { TemplateSubmission } from '../entities/template-submission.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      SupplierSubmission,
      ProcessingLog,
      SupplierTemplate,
      TemplateSubmission,
    ]),
    AuditModule,
  ],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    TemplateService,
    TemplateNotificationService,
    TemplateImprovementService,
  ],
  exports: [
    SuppliersService,
    TemplateService,
    TemplateNotificationService,
    TemplateImprovementService,
  ],
})
export class SuppliersModule {}