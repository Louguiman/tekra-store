import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { Supplier } from '../entities/supplier.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  submissions: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    last24Hours: number;
  };
  processing: {
    averageTimeMs: number;
    successRate: number;
    failureRate: number;
  };
  suppliers: {
    total: number;
    active: number;
    inactive: number;
  };
  errors: {
    last24Hours: number;
    criticalErrors: number;
    byStage: Record<string, number>;
  };
}

export interface CriticalError {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  metadata?: Record<string, any>;
  escalated: boolean;
  resolvedAt?: Date;
}

export interface DiagnosticInfo {
  timestamp: Date;
  systemMetrics: SystemMetrics;
  recentErrors: CriticalError[];
  healthChecks: HealthCheck[];
  configuration: {
    webhookSecret: boolean;
    aiServiceAvailable: boolean;
    databaseConnected: boolean;
  };
}

@Injectable()
export class HealthMonitoringService {
  private readonly logger = new Logger(HealthMonitoringService.name);
  private readonly startTime = Date.now();
  private readonly criticalErrors: Map<string, CriticalError> = new Map();
  private readonly escalationThreshold = {
    low: 10,
    medium: 5,
    high: 2,
    critical: 1,
  };

  constructor(
    @InjectRepository(SupplierSubmission)
    private submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(ProcessingLog)
    private processingLogRepository: Repository<ProcessingLog>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private auditService: AuditService,
  ) {}

  /**
   * Perform comprehensive health check
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Database connectivity check
    checks.push(await this.checkDatabaseConnection());

    // Submission processing check
    checks.push(await this.checkSubmissionProcessing());

    // Error rate check
    checks.push(await this.checkErrorRate());

    // Queue health check
    checks.push(await this.checkQueueHealth());

    // Configuration check
    checks.push(this.checkConfiguration());

    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;

    let status: HealthStatus['status'] = 'healthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check database connectivity
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  private async checkDatabaseConnection(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.submissionRepository.query('SELECT 1');
      
      return {
        name: 'database',
        status: 'pass',
        message: 'Database connection is healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      
      return {
        name: 'database',
        status: 'fail',
        message: `Database connection failed: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check submission processing health
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  private async checkSubmissionProcessing(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const pendingCount = await this.submissionRepository.count({
        where: { processingStatus: 'pending' },
      });

      const processingCount = await this.submissionRepository.count({
        where: { processingStatus: 'processing' },
      });

      // Warn if too many pending submissions
      if (pendingCount > 100) {
        return {
          name: 'submission_processing',
          status: 'warn',
          message: `High number of pending submissions: ${pendingCount}`,
          responseTime: Date.now() - startTime,
          metadata: { pendingCount, processingCount },
        };
      }

      return {
        name: 'submission_processing',
        status: 'pass',
        message: 'Submission processing is healthy',
        responseTime: Date.now() - startTime,
        metadata: { pendingCount, processingCount },
      };
    } catch (error) {
      this.logger.error(`Submission processing health check failed: ${error.message}`);
      
      return {
        name: 'submission_processing',
        status: 'fail',
        message: `Failed to check submission processing: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check error rate
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  private async checkErrorRate(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const totalSubmissions = await this.submissionRepository.count({
        where: { createdAt: { $gte: last24Hours } as any },
      });

      const failedSubmissions = await this.submissionRepository.count({
        where: { 
          processingStatus: 'failed',
          createdAt: { $gte: last24Hours } as any,
        },
      });

      const errorRate = totalSubmissions > 0 ? (failedSubmissions / totalSubmissions) * 100 : 0;

      // Warn if error rate is above 10%
      if (errorRate > 10) {
        return {
          name: 'error_rate',
          status: 'warn',
          message: `High error rate: ${errorRate.toFixed(2)}%`,
          responseTime: Date.now() - startTime,
          metadata: { errorRate, totalSubmissions, failedSubmissions },
        };
      }

      // Fail if error rate is above 25%
      if (errorRate > 25) {
        return {
          name: 'error_rate',
          status: 'fail',
          message: `Critical error rate: ${errorRate.toFixed(2)}%`,
          responseTime: Date.now() - startTime,
          metadata: { errorRate, totalSubmissions, failedSubmissions },
        };
      }

      return {
        name: 'error_rate',
        status: 'pass',
        message: `Error rate is acceptable: ${errorRate.toFixed(2)}%`,
        responseTime: Date.now() - startTime,
        metadata: { errorRate, totalSubmissions, failedSubmissions },
      };
    } catch (error) {
      this.logger.error(`Error rate health check failed: ${error.message}`);
      
      return {
        name: 'error_rate',
        status: 'fail',
        message: `Failed to check error rate: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check queue health
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  private async checkQueueHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check for stuck submissions (processing for more than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const stuckSubmissions = await this.submissionRepository.count({
        where: {
          processingStatus: 'processing',
          updatedAt: { $lt: oneHourAgo } as any,
        },
      });

      if (stuckSubmissions > 0) {
        return {
          name: 'queue_health',
          status: 'warn',
          message: `Found ${stuckSubmissions} stuck submission(s)`,
          responseTime: Date.now() - startTime,
          metadata: { stuckSubmissions },
        };
      }

      return {
        name: 'queue_health',
        status: 'pass',
        message: 'Queue is healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Queue health check failed: ${error.message}`);
      
      return {
        name: 'queue_health',
        status: 'fail',
        message: `Failed to check queue health: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check system configuration
   * Requirement 10.5: Add health checks and monitoring endpoints
   */
  private checkConfiguration(): HealthCheck {
    const startTime = Date.now();
    const issues: string[] = [];

    if (!process.env.WHATSAPP_WEBHOOK_SECRET) {
      issues.push('WHATSAPP_WEBHOOK_SECRET not configured');
    }

    if (!process.env.WHATSAPP_API_TOKEN) {
      issues.push('WHATSAPP_API_TOKEN not configured');
    }

    if (issues.length > 0) {
      return {
        name: 'configuration',
        status: 'fail',
        message: `Configuration issues: ${issues.join(', ')}`,
        responseTime: Date.now() - startTime,
        metadata: { issues },
      };
    }

    return {
      name: 'configuration',
      status: 'pass',
      message: 'Configuration is valid',
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Collect system metrics
   * Requirement 10.5: Create diagnostic information collection
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Submission metrics
    const [total, pending, processing, completed, failed, last24HoursCount] = await Promise.all([
      this.submissionRepository.count(),
      this.submissionRepository.count({ where: { processingStatus: 'pending' } }),
      this.submissionRepository.count({ where: { processingStatus: 'processing' } }),
      this.submissionRepository.count({ where: { processingStatus: 'completed' } }),
      this.submissionRepository.count({ where: { processingStatus: 'failed' } }),
      this.submissionRepository.count({ 
        where: { createdAt: { $gte: last24Hours } as any },
      }),
    ]);

    // Processing metrics
    const completedLogs = await this.processingLogRepository.find({
      where: { 
        processingStatus: 'completed',
        createdAt: { $gte: last24Hours } as any,
      },
    });

    const averageTimeMs = completedLogs.length > 0
      ? completedLogs.reduce((sum, log) => sum + log.processingTimeMs, 0) / completedLogs.length
      : 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Supplier metrics
    const [totalSuppliers, activeSuppliers] = await Promise.all([
      this.supplierRepository.count(),
      this.supplierRepository.count({ where: { isActive: true } }),
    ]);

    // Error metrics
    const errorLogs = await this.processingLogRepository.find({
      where: {
        processingStatus: 'failed',
        createdAt: { $gte: last24Hours } as any,
      },
    });

    const errorsByStage = errorLogs.reduce((acc, log) => {
      acc[log.processingStage] = (acc[log.processingStage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalErrors = Array.from(this.criticalErrors.values())
      .filter(e => e.severity === 'critical' && !e.resolvedAt).length;

    return {
      submissions: {
        total,
        pending,
        processing,
        completed,
        failed,
        last24Hours: last24HoursCount,
      },
      processing: {
        averageTimeMs,
        successRate,
        failureRate,
      },
      suppliers: {
        total: totalSuppliers,
        active: activeSuppliers,
        inactive: totalSuppliers - activeSuppliers,
      },
      errors: {
        last24Hours: errorLogs.length,
        criticalErrors,
        byStage: errorsByStage,
      },
    };
  }

  /**
   * Record a critical error
   * Requirement 10.4: Implement critical error escalation system
   */
  async recordCriticalError(
    component: string,
    message: string,
    severity: CriticalError['severity'],
    metadata?: Record<string, any>,
  ): Promise<string> {
    const errorId = `${component}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const error: CriticalError = {
      id: errorId,
      timestamp: new Date(),
      severity,
      component,
      message,
      metadata,
      escalated: false,
    };

    this.criticalErrors.set(errorId, error);
    
    this.logger.error(`Critical error recorded: [${severity}] ${component}: ${message}`, metadata);

    // Check if escalation is needed
    await this.checkEscalation(error);

    // Log to audit trail
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      description: `Critical error: [${severity}] ${component}: ${message}`,
      metadata: {
        errorId,
        severity,
        component,
        ...metadata,
      },
    });

    return errorId;
  }

  /**
   * Check if error escalation is needed
   * Requirement 10.4: Implement critical error escalation system
   */
  private async checkEscalation(error: CriticalError): Promise<void> {
    const recentErrors = Array.from(this.criticalErrors.values())
      .filter(e => 
        e.severity === error.severity &&
        e.timestamp.getTime() > Date.now() - 60 * 60 * 1000 && // Last hour
        !e.resolvedAt
      );

    const threshold = this.escalationThreshold[error.severity];

    if (recentErrors.length >= threshold) {
      await this.escalateError(error, recentErrors.length);
    }
  }

  /**
   * Escalate a critical error to administrators
   * Requirement 10.4: Implement critical error escalation system
   */
  private async escalateError(error: CriticalError, errorCount: number): Promise<void> {
    if (error.escalated) {
      return; // Already escalated
    }

    error.escalated = true;
    
    this.logger.error(
      `ESCALATION: ${errorCount} ${error.severity} errors in the last hour. ` +
      `Latest: ${error.component}: ${error.message}`
    );

    // Log escalation to audit trail
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      description: `Error escalated: ${errorCount} ${error.severity} errors detected`,
      metadata: {
        errorId: error.id,
        severity: error.severity,
        component: error.component,
        errorCount,
        message: error.message,
      },
    });

    // In production, this would send notifications to on-call administrators
    // via email, SMS, PagerDuty, etc.
  }

  /**
   * Resolve a critical error
   * Requirement 10.4: Implement critical error escalation system
   */
  async resolveCriticalError(errorId: string): Promise<void> {
    const error = this.criticalErrors.get(errorId);
    
    if (!error) {
      throw new Error(`Error ${errorId} not found`);
    }

    error.resolvedAt = new Date();
    
    this.logger.log(`Critical error resolved: ${errorId}`);

    // Log resolution to audit trail
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      description: `Critical error resolved: ${error.component}: ${error.message}`,
      metadata: {
        errorId,
        severity: error.severity,
        component: error.component,
        resolvedAt: error.resolvedAt,
      },
    });
  }

  /**
   * Get all unresolved critical errors
   * Requirement 10.4: Implement critical error escalation system
   */
  getUnresolvedErrors(): CriticalError[] {
    return Array.from(this.criticalErrors.values())
      .filter(e => !e.resolvedAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Collect comprehensive diagnostic information
   * Requirement 10.5: Create diagnostic information collection
   */
  async collectDiagnosticInfo(): Promise<DiagnosticInfo> {
    const [systemMetrics, healthStatus] = await Promise.all([
      this.collectSystemMetrics(),
      this.performHealthCheck(),
    ]);

    const recentErrors = Array.from(this.criticalErrors.values())
      .filter(e => e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Last 50 errors

    return {
      timestamp: new Date(),
      systemMetrics,
      recentErrors,
      healthChecks: healthStatus.checks,
      configuration: {
        webhookSecret: !!process.env.WHATSAPP_WEBHOOK_SECRET,
        aiServiceAvailable: !!process.env.OLLAMA_BASE_URL,
        databaseConnected: healthStatus.checks.find(c => c.name === 'database')?.status === 'pass',
      },
    };
  }

  /**
   * Clear resolved errors older than 7 days
   * Requirement 10.4: Implement critical error escalation system
   */
  cleanupOldErrors(): void {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (const [id, error] of this.criticalErrors.entries()) {
      if (error.resolvedAt && error.resolvedAt.getTime() < sevenDaysAgo) {
        this.criticalErrors.delete(id);
      }
    }
  }
}
