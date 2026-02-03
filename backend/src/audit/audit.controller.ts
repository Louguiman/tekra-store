import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { AuditService } from './audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { AlertType, AlertSeverity, AlertStatus } from '../entities/security-alert.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admins can access audit logs
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs(
    @Query() query: {
      userId?: string;
      action?: AuditAction;
      resource?: AuditResource;
      severity?: AuditSeverity;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const filters = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.auditService.getAuditLogs(filters);
  }

  @Get('alerts')
  async getSecurityAlerts(
    @Query() query: {
      type?: AlertType;
      severity?: AlertSeverity;
      status?: AlertStatus;
      affectedUserId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const filters = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.auditService.getSecurityAlerts(filters);
  }

  @Patch('alerts/:id/resolve')
  async resolveSecurityAlert(
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() body: { resolutionNotes?: string; status?: AlertStatus },
    @CurrentUser() user: any,
  ) {
    return this.auditService.resolveSecurityAlert(
      alertId,
      user.id,
      body.resolutionNotes,
      body.status,
    );
  }

  @Get('statistics')
  async getAuditStatistics(
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const [auditStats, alertStats] = await Promise.all([
      this.auditService.getAuditStatistics(startDate, endDate),
      this.auditService.getSecurityAlertStatistics(startDate, endDate),
    ]);

    return {
      audit: auditStats,
      security: alertStats,
    };
  }
}