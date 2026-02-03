import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { SecurityAlert, AlertType, AlertSeverity, AlertStatus } from '../entities/security-alert.entity';
import { User } from '../entities/user.entity';

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  severity?: AuditSeverity;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface SecurityAlertData {
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  details?: Record<string, any>;
  affectedUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(SecurityAlert)
    private readonly securityAlertRepository: Repository<SecurityAlert>,
  ) {}

  async logAction(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        severity: data.severity || AuditSeverity.LOW,
        description: data.description,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        success: data.success !== false, // Default to true unless explicitly false
        errorMessage: data.errorMessage,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);
      
      // Log to application logger for immediate visibility
      this.logger.log(`Audit: ${data.action} on ${data.resource} by user ${data.userId || 'anonymous'}`);
      
      return savedLog;
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      throw error;
    }
  }

  async createSecurityAlert(data: SecurityAlertData): Promise<SecurityAlert> {
    try {
      const alert = this.securityAlertRepository.create({
        type: data.type,
        severity: data.severity,
        description: data.description,
        details: data.details,
        affectedUserId: data.affectedUserId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: AlertStatus.OPEN,
      });

      const savedAlert = await this.securityAlertRepository.save(alert);
      
      // Log critical alerts immediately
      if (data.severity === AlertSeverity.CRITICAL || data.severity === AlertSeverity.HIGH) {
        this.logger.warn(`Security Alert [${data.severity.toUpperCase()}]: ${data.description}`);
      }
      
      return savedAlert;
    } catch (error) {
      this.logger.error('Failed to create security alert', error);
      throw error;
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: AuditAction;
    resource?: AuditResource;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      resource,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.createdAt', 'DESC');

    if (userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (resource) {
      queryBuilder.andWhere('audit.resource = :resource', { resource });
    }

    if (severity) {
      queryBuilder.andWhere('audit.severity = :severity', { severity });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSecurityAlerts(filters: {
    type?: AlertType;
    severity?: AlertSeverity;
    status?: AlertStatus;
    affectedUserId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      type,
      severity,
      status,
      affectedUserId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const queryBuilder = this.securityAlertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.affectedUser', 'user')
      .orderBy('alert.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('alert.type = :type', { type });
    }

    if (severity) {
      queryBuilder.andWhere('alert.severity = :severity', { severity });
    }

    if (status) {
      queryBuilder.andWhere('alert.status = :status', { status });
    }

    if (affectedUserId) {
      queryBuilder.andWhere('alert.affectedUserId = :affectedUserId', { affectedUserId });
    }

    if (startDate) {
      queryBuilder.andWhere('alert.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('alert.createdAt <= :endDate', { endDate });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [alerts, total] = await queryBuilder.getManyAndCount();

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resolveSecurityAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes?: string,
    status: AlertStatus = AlertStatus.RESOLVED,
  ): Promise<SecurityAlert> {
    const alert = await this.securityAlertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Security alert not found');
    }

    alert.status = status;
    alert.resolvedBy = resolvedBy;
    alert.resolutionNotes = resolutionNotes;
    alert.resolvedAt = new Date();

    return this.securityAlertRepository.save(alert);
  }

  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    const [
      totalLogs,
      actionStats,
      resourceStats,
      severityStats,
      failedActions,
    ] = await Promise.all([
      queryBuilder.getCount(),
      
      queryBuilder
        .clone()
        .select('audit.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.action')
        .getRawMany(),
        
      queryBuilder
        .clone()
        .select('audit.resource', 'resource')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.resource')
        .getRawMany(),
        
      queryBuilder
        .clone()
        .select('audit.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.severity')
        .getRawMany(),
        
      queryBuilder
        .clone()
        .andWhere('audit.success = false')
        .getCount(),
    ]);

    return {
      totalLogs,
      failedActions,
      successRate: totalLogs > 0 ? ((totalLogs - failedActions) / totalLogs) * 100 : 100,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: parseInt(stat.count),
      })),
      resourceStats: resourceStats.map(stat => ({
        resource: stat.resource,
        count: parseInt(stat.count),
      })),
      severityStats: severityStats.map(stat => ({
        severity: stat.severity,
        count: parseInt(stat.count),
      })),
    };
  }

  async getSecurityAlertStatistics(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.securityAlertRepository.createQueryBuilder('alert');

    if (startDate) {
      queryBuilder.andWhere('alert.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('alert.createdAt <= :endDate', { endDate });
    }

    const [
      totalAlerts,
      openAlerts,
      typeStats,
      severityStats,
      statusStats,
    ] = await Promise.all([
      queryBuilder.getCount(),
      
      queryBuilder
        .clone()
        .andWhere('alert.status = :status', { status: AlertStatus.OPEN })
        .getCount(),
        
      queryBuilder
        .clone()
        .select('alert.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('alert.type')
        .getRawMany(),
        
      queryBuilder
        .clone()
        .select('alert.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .groupBy('alert.severity')
        .getRawMany(),
        
      queryBuilder
        .clone()
        .select('alert.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('alert.status')
        .getRawMany(),
    ]);

    return {
      totalAlerts,
      openAlerts,
      resolvedAlerts: totalAlerts - openAlerts,
      resolutionRate: totalAlerts > 0 ? ((totalAlerts - openAlerts) / totalAlerts) * 100 : 100,
      typeStats: typeStats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count),
      })),
      severityStats: severityStats.map(stat => ({
        severity: stat.severity,
        count: parseInt(stat.count),
      })),
      statusStats: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.count),
      })),
    };
  }
}