import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { SecurityMonitorService } from './security-monitor.service';
import { AuditLog } from '../entities/audit-log.entity';
import { SecurityAlert } from '../entities/security-alert.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, SecurityAlert, User]),
  ],
  providers: [AuditService, SecurityMonitorService],
  controllers: [AuditController],
  exports: [AuditService, SecurityMonitorService],
})
export class AuditModule {}