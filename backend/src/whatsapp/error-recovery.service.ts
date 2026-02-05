import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export interface FailedOperation {
  id: string;
  operationType: 'webhook' | 'ai_extraction' | 'validation' | 'inventory_update';
  submissionId?: string;
  error: string;
  attempts: number;
  lastAttemptAt: Date;
  nextRetryAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);
  private readonly failedOperationsQueue: Map<string, FailedOperation> = new Map();
  
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  };

  constructor(
    @InjectRepository(SupplierSubmission)
    private submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(ProcessingLog)
    private processingLogRepository: Repository<ProcessingLog>,
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  /**
   * Execute an operation with exponential backoff retry logic
   * Requirement 10.1: Implement exponential backoff for webhook retries
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {},
  ): Promise<RetryResult<T>> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      attempts++;
      
      try {
        this.logger.log(`Executing ${operationName} (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
        
        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        this.logger.log(`${operationName} succeeded after ${attempts} attempt(s) in ${totalTime}ms`);
        
        return {
          success: true,
          result,
          attempts,
          totalTime,
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(`${operationName} failed (attempt ${attempt + 1}): ${error.message}`);
        
        // Don't retry on last attempt
        if (attempt < retryConfig.maxRetries) {
          const delayMs = this.calculateBackoffDelay(attempt, retryConfig);
          this.logger.log(`Retrying ${operationName} in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    this.logger.error(`${operationName} failed after ${attempts} attempts in ${totalTime}ms`);
    
    return {
      success: false,
      error: lastError,
      attempts,
      totalTime,
    };
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Requirement 10.1: Implement exponential backoff for webhook retries
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Add a failed operation to the retry queue
   * Requirement 10.2: Add queue management for failed operations
   */
  async queueFailedOperation(
    operationType: FailedOperation['operationType'],
    error: Error,
    submissionId?: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const operationId = `${operationType}-${submissionId || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const failedOperation: FailedOperation = {
      id: operationId,
      operationType,
      submissionId,
      error: error.message,
      attempts: 0,
      lastAttemptAt: new Date(),
      nextRetryAt: new Date(Date.now() + this.defaultRetryConfig.initialDelayMs),
      metadata,
    };

    this.failedOperationsQueue.set(operationId, failedOperation);
    
    this.logger.log(`Queued failed operation: ${operationId} (${operationType})`);
    
    // Log to audit trail
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: submissionId,
      description: `Operation ${operationType} failed and queued for retry: ${error.message}`,
      metadata: {
        operationId,
        operationType,
        error: error.message,
        ...metadata,
      },
    });

    return operationId;
  }

  /**
   * Get all failed operations from the queue
   * Requirement 10.2: Add queue management for failed operations
   */
  getFailedOperations(): FailedOperation[] {
    return Array.from(this.failedOperationsQueue.values());
  }

  /**
   * Get failed operations ready for retry
   * Requirement 10.2: Add queue management for failed operations
   */
  getOperationsReadyForRetry(): FailedOperation[] {
    const now = new Date();
    return this.getFailedOperations().filter(op => op.nextRetryAt <= now);
  }

  /**
   * Remove an operation from the failed queue
   * Requirement 10.2: Add queue management for failed operations
   */
  removeFromQueue(operationId: string): boolean {
    return this.failedOperationsQueue.delete(operationId);
  }

  /**
   * Update retry attempt for a failed operation
   * Requirement 10.2: Add queue management for failed operations
   */
  updateRetryAttempt(operationId: string, success: boolean, error?: Error): void {
    const operation = this.failedOperationsQueue.get(operationId);
    
    if (!operation) {
      return;
    }

    operation.attempts++;
    operation.lastAttemptAt = new Date();

    if (success) {
      this.failedOperationsQueue.delete(operationId);
      this.logger.log(`Operation ${operationId} succeeded after ${operation.attempts} retry attempts`);
    } else {
      if (operation.attempts >= this.defaultRetryConfig.maxRetries) {
        this.logger.error(`Operation ${operationId} exceeded max retries (${operation.attempts})`);
        // Keep in queue for manual intervention but mark as exhausted
        operation.metadata = { ...operation.metadata, exhausted: true };
      } else {
        const nextDelay = this.calculateBackoffDelay(operation.attempts, this.defaultRetryConfig);
        operation.nextRetryAt = new Date(Date.now() + nextDelay);
        operation.error = error?.message || operation.error;
        this.logger.log(`Operation ${operationId} will retry in ${nextDelay}ms (attempt ${operation.attempts + 1})`);
      }
    }
  }

  /**
   * Execute database operations within a transaction with automatic rollback
   * Requirement 10.3: Create database transaction rollback logic
   */
  async executeInTransaction<T>(
    operation: (queryRunner: any) => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Starting transaction for ${operationName}`);
      
      const result = await operation(queryRunner);
      
      await queryRunner.commitTransaction();
      this.logger.log(`Transaction committed for ${operationName}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Transaction failed for ${operationName}: ${error.message}`);
      
      try {
        await queryRunner.rollbackTransaction();
        this.logger.log(`Transaction rolled back for ${operationName}`);
      } catch (rollbackError) {
        this.logger.error(`Rollback failed for ${operationName}: ${rollbackError.message}`);
      }
      
      // Log rollback to audit trail
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        description: `Transaction rolled back for ${operationName}: ${error.message}`,
        metadata: {
          operationName,
          error: error.message,
        },
      });
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retry a failed submission processing
   * Requirement 10.1, 10.2: Retry logic with queue management
   */
  async retryFailedSubmission(submissionId: string): Promise<RetryResult<void>> {
    return this.executeWithRetry(
      async () => {
        const submission = await this.submissionRepository.findOne({
          where: { id: submissionId },
          relations: ['supplier'],
        });

        if (!submission) {
          throw new Error(`Submission ${submissionId} not found`);
        }

        if (submission.processingStatus === 'completed') {
          this.logger.log(`Submission ${submissionId} already completed`);
          return;
        }

        // Reset status to pending for retry
        submission.processingStatus = 'pending';
        await this.submissionRepository.save(submission);

        this.logger.log(`Submission ${submissionId} reset to pending for retry`);
      },
      `retryFailedSubmission-${submissionId}`,
    );
  }

  /**
   * Get processing logs for a submission to diagnose failures
   * Requirement 10.2: Queue management for failed operations
   */
  async getProcessingLogs(submissionId: string): Promise<ProcessingLog[]> {
    return this.processingLogRepository.find({
      where: { submission: { id: submissionId } },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Mark a submission as permanently failed after exhausting retries
   * Requirement 10.2: Queue management for failed operations
   */
  async markSubmissionAsFailed(submissionId: string, reason: string): Promise<void> {
    await this.executeInTransaction(
      async (queryRunner) => {
        const submission = await queryRunner.manager.findOne(SupplierSubmission, {
          where: { id: submissionId },
        });

        if (!submission) {
          throw new Error(`Submission ${submissionId} not found`);
        }

        submission.processingStatus = 'failed';
        await queryRunner.manager.save(submission);

        // Log the permanent failure
        const log = queryRunner.manager.create(ProcessingLog, {
          submission: { id: submissionId },
          processingStage: 'webhook',
          processingStatus: 'failed',
          processingTimeMs: 0,
          errorMessage: `Permanently failed: ${reason}`,
          metadata: { permanentFailure: true, reason },
        });
        await queryRunner.manager.save(log);
      },
      `markSubmissionAsFailed-${submissionId}`,
    );

    // Log to audit trail
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: submissionId,
      description: `Submission permanently failed: ${reason}`,
      metadata: { reason, permanentFailure: true },
    });
  }

  /**
   * Get statistics about failed operations
   * Requirement 10.2: Queue management for failed operations
   */
  getQueueStatistics(): {
    total: number;
    byType: Record<string, number>;
    readyForRetry: number;
    exhausted: number;
  } {
    const operations = this.getFailedOperations();
    const readyForRetry = this.getOperationsReadyForRetry();
    const exhausted = operations.filter(op => op.metadata?.exhausted === true);

    const byType = operations.reduce((acc, op) => {
      acc[op.operationType] = (acc[op.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: operations.length,
      byType,
      readyForRetry: readyForRetry.length,
      exhausted: exhausted.length,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
