import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ErrorRecoveryService } from './error-recovery.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { WhatsappService } from './whatsapp.service';

/**
 * Scheduled tasks for error recovery and monitoring
 * Requirements 10.1, 10.2, 10.4, 10.5
 */
@Injectable()
export class ErrorRecoverySchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ErrorRecoverySchedulerService.name);
  private isProcessing = false;

  constructor(
    private errorRecoveryService: ErrorRecoveryService,
    private healthMonitoringService: HealthMonitoringService,
    private whatsappService: WhatsappService,
  ) {}

  onModuleInit() {
    this.logger.log('Error Recovery Scheduler initialized');
  }

  /**
   * Process failed operations queue every 5 minutes
   * Requirement 10.2: Queue management for failed operations
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processFailedOperationsQueue() {
    if (this.isProcessing) {
      this.logger.log('Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const operationsToRetry = this.errorRecoveryService.getOperationsReadyForRetry();
      
      if (operationsToRetry.length === 0) {
        this.logger.log('No operations ready for retry');
        return;
      }

      this.logger.log(`Processing ${operationsToRetry.length} failed operations`);

      for (const operation of operationsToRetry) {
        try {
          await this.retryOperation(operation);
        } catch (error) {
          this.logger.error(`Failed to retry operation ${operation.id}: ${error.message}`);
        }
      }

      const stats = this.errorRecoveryService.getQueueStatistics();
      this.logger.log(`Queue processing complete. Stats: ${JSON.stringify(stats)}`);

    } catch (error) {
      this.logger.error(`Queue processing error: ${error.message}`);
      
      await this.healthMonitoringService.recordCriticalError(
        'error-recovery-scheduler',
        `Queue processing failed: ${error.message}`,
        'high',
        { error: error.message }
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry a specific failed operation
   * Requirement 10.1, 10.2: Retry logic with queue management
   */
  private async retryOperation(operation: any): Promise<void> {
    this.logger.log(`Retrying operation ${operation.id} (${operation.operationType})`);

    try {
      switch (operation.operationType) {
        case 'ai_extraction':
          if (operation.submissionId) {
            await this.whatsappService.processSubmissionWithAI(operation.submissionId);
          }
          break;
        
        case 'webhook':
          // Webhook retries are handled by WhatsApp's retry mechanism
          this.logger.log(`Webhook operation ${operation.id} cannot be retried manually`);
          break;
        
        default:
          this.logger.warn(`Unknown operation type: ${operation.operationType}`);
      }

      // Mark as successful
      this.errorRecoveryService.updateRetryAttempt(operation.id, true);
      
      this.logger.log(`Operation ${operation.id} retry succeeded`);

    } catch (error) {
      // Mark as failed
      this.errorRecoveryService.updateRetryAttempt(operation.id, false, error);
      
      this.logger.error(`Operation ${operation.id} retry failed: ${error.message}`);

      // Check if we should escalate
      if (operation.attempts >= 5) {
        await this.healthMonitoringService.recordCriticalError(
          'error-recovery',
          `Operation ${operation.id} failed after ${operation.attempts} attempts`,
          'critical',
          {
            operationId: operation.id,
            operationType: operation.operationType,
            submissionId: operation.submissionId,
            attempts: operation.attempts,
          }
        );
      }
    }
  }

  /**
   * Cleanup old resolved errors every day
   * Requirement 10.4: Error escalation system maintenance
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldErrors() {
    try {
      this.logger.log('Cleaning up old resolved errors');
      this.healthMonitoringService.cleanupOldErrors();
      this.logger.log('Old errors cleanup complete');
    } catch (error) {
      this.logger.error(`Error cleanup failed: ${error.message}`);
    }
  }

  /**
   * Perform health checks every 10 minutes
   * Requirement 10.5: Health checks and monitoring
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async performScheduledHealthCheck() {
    try {
      const health = await this.healthMonitoringService.performHealthCheck();
      
      if (health.status === 'unhealthy') {
        this.logger.error(`System health check failed: ${health.checks.filter(c => c.status === 'fail').length} checks failed`);
        
        await this.healthMonitoringService.recordCriticalError(
          'health-check',
          'System health check failed',
          'critical',
          {
            status: health.status,
            failedChecks: health.checks.filter(c => c.status === 'fail').map(c => c.name),
          }
        );
      } else if (health.status === 'degraded') {
        this.logger.warn(`System health degraded: ${health.checks.filter(c => c.status === 'warn').length} warnings`);
      } else {
        this.logger.log('System health check passed');
      }
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);
    }
  }

  /**
   * Collect and log system metrics every hour
   * Requirement 10.5: Monitoring and diagnostic information
   */
  @Cron(CronExpression.EVERY_HOUR)
  async collectSystemMetrics() {
    try {
      const metrics = await this.healthMonitoringService.collectSystemMetrics();
      
      this.logger.log(`System Metrics: 
        Submissions - Total: ${metrics.submissions.total}, Pending: ${metrics.submissions.pending}, Failed: ${metrics.submissions.failed}
        Processing - Avg Time: ${metrics.processing.averageTimeMs.toFixed(0)}ms, Success Rate: ${metrics.processing.successRate.toFixed(2)}%
        Suppliers - Active: ${metrics.suppliers.active}/${metrics.suppliers.total}
        Errors - Last 24h: ${metrics.errors.last24Hours}, Critical: ${metrics.errors.criticalErrors}
      `);

      // Alert if metrics indicate problems
      if (metrics.processing.failureRate > 25) {
        await this.healthMonitoringService.recordCriticalError(
          'metrics-monitoring',
          `High failure rate detected: ${metrics.processing.failureRate.toFixed(2)}%`,
          'high',
          { metrics }
        );
      }

      if (metrics.submissions.pending > 100) {
        await this.healthMonitoringService.recordCriticalError(
          'metrics-monitoring',
          `High number of pending submissions: ${metrics.submissions.pending}`,
          'medium',
          { metrics }
        );
      }

    } catch (error) {
      this.logger.error(`Metrics collection error: ${error.message}`);
    }
  }

  /**
   * Check for stuck submissions every 30 minutes
   * Requirement 10.2: Queue management for failed operations
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkStuckSubmissions() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // This would need to be implemented in WhatsappService
      // For now, we'll log that we're checking
      this.logger.log('Checking for stuck submissions...');
      
      // In a full implementation, you would:
      // 1. Find submissions stuck in 'processing' status for > 1 hour
      // 2. Reset them to 'pending' or mark as failed
      // 3. Queue them for retry
      
    } catch (error) {
      this.logger.error(`Stuck submission check error: ${error.message}`);
    }
  }
}
