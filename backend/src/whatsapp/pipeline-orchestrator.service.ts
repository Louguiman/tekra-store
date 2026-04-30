import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';
import { ValidationService } from '../admin/validation.service';
import { InventoryIntegrationService } from '../admin/inventory-integration.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { ErrorRecoveryService } from './error-recovery.service';
import { HealthMonitoringService } from './health-monitoring.service';

/**
 * Pipeline Orchestrator Service
 * 
 * This service orchestrates the complete message flow from WhatsApp to inventory:
 * 1. WhatsApp webhook receives message
 * 2. AI processing extracts product data
 * 3. Human validation reviews and approves
 * 4. Inventory integration creates/updates products
 * 
 * Requirements: All requirements (complete pipeline integration)
 */
@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);

  constructor(
    @InjectRepository(SupplierSubmission)
    private readonly submissionRepository: Repository<SupplierSubmission>,
    private readonly whatsappService: WhatsappService,
    private readonly validationService: ValidationService,
    private readonly inventoryIntegrationService: InventoryIntegrationService,
    private readonly auditService: AuditService,
    private readonly errorRecoveryService: ErrorRecoveryService,
    private readonly healthMonitoringService: HealthMonitoringService,
  ) {}

  /**
   * Process a complete submission through the entire pipeline
   * This is the main orchestration method that connects all components
   */
  async processSubmissionPipeline(submissionId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`[PIPELINE] ===== START pipeline for submission ${submissionId} =====`);

      // Step 1: Verify submission exists and is ready for processing
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['supplier'],
      });

      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      this.logger.log(`[PIPELINE][1] Submission loaded — status: ${submission.processingStatus}, validationStatus: ${submission.validationStatus}, supplier: ${submission.supplier.name}, contentType: ${submission.contentType}`);

      // Step 2: Process with AI if not already processed
      if (submission.processingStatus === 'pending') {
        this.logger.log(`[PIPELINE][2] Dispatching to AI processing — submissionId: ${submissionId}`);
        await this.whatsappService.processSubmissionWithAI(submissionId);
        
        // Reload submission to get updated data
        const updatedSubmission = await this.submissionRepository.findOne({
          where: { id: submissionId },
          relations: ['supplier'],
        });
        
        if (!updatedSubmission) {
          throw new Error(`Submission ${submissionId} not found after AI processing`);
        }
        
        Object.assign(submission, updatedSubmission);
        this.logger.log(`[PIPELINE][2] AI processing done — status: ${submission.processingStatus}, extractedProducts: ${submission.extractedData?.length ?? 0}`);
      } else {
        this.logger.log(`[PIPELINE][2] Skipping AI processing — already in status: ${submission.processingStatus}`);
      }

      // Step 3: Check if AI processing was successful
      if (submission.processingStatus !== 'completed') {
        throw new Error(`Submission ${submissionId} AI processing failed or incomplete`);
      }

      this.logger.log(`[PIPELINE][3] AI processing status verified: completed`);

      // Step 4: Validate extracted data exists
      if (!submission.extractedData || submission.extractedData.length === 0) {
        throw new Error(`No extracted data found for submission ${submissionId}`);
      }

      this.logger.log(`[PIPELINE][4] Extracted data validated — ${submission.extractedData.length} product(s)`);

      // Step 5: Check for auto-approval eligibility
      this.logger.log(`[PIPELINE][5] Checking auto-approval eligibility for submission ${submissionId}`);
      const autoApprovalResult = await this.checkAutoApproval(submission);
      this.logger.log(`[PIPELINE][5] Auto-approval result — eligible: ${autoApprovalResult.eligible}, reason: ${autoApprovalResult.reason}`);
      
      if (autoApprovalResult.eligible) {
        this.logger.log(`[PIPELINE][6] Auto-approving submission ${submissionId}`);
        await this.autoApproveSubmission(submission, autoApprovalResult.reason);
        this.logger.log(`[PIPELINE][6] Auto-approval complete — submission ${submissionId} integrated into inventory`);
      } else {
        this.logger.log(`[PIPELINE][6] Submission ${submissionId} queued for human validation — reason: ${autoApprovalResult.reason}`);
      }

      const processingTime = Date.now() - startTime;

      // Log successful pipeline processing
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submissionId,
        severity: AuditSeverity.MEDIUM,
        description: `Pipeline processing completed for submission`,
        metadata: {
          submissionId,
          supplierId: submission.supplier.id,
          processingTime,
          autoApproved: autoApprovalResult.eligible,
          extractedProductsCount: submission.extractedData.length,
        },
        success: true,
      });

      this.logger.log(`[PIPELINE] ===== END pipeline for submission ${submissionId} — totalTime: ${processingTime}ms, autoApproved: ${autoApprovalResult.eligible} =====`);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error(`[PIPELINE] ===== FAILED pipeline for submission ${submissionId} after ${processingTime}ms: ${error.message} =====`, error.stack);

      // Log the failure
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submissionId,
        severity: AuditSeverity.HIGH,
        description: `Pipeline processing failed: ${error.message}`,
        metadata: {
          submissionId,
          error: error.message,
          processingTime,
        },
        success: false,
      });

      // Record critical error for monitoring
      await this.healthMonitoringService.recordCriticalError(
        'pipeline-processing',
        `Pipeline processing failed for submission ${submissionId}: ${error.message}`,
        'high',
        { submissionId, error: error.message }
      );

      throw error;
    }
  }

  /**
   * Check if a submission is eligible for auto-approval
   * Based on supplier trust level and extraction confidence
   */
  private async checkAutoApproval(submission: SupplierSubmission): Promise<{ eligible: boolean; reason?: string }> {
    // Check supplier performance metrics
    const supplier = submission.supplier;
    const metrics = supplier.performanceMetrics;

    // Auto-approval criteria:
    // 1. Supplier has at least 10 successful submissions
    // 2. Supplier approval rate is >= 90%
    // 3. All extracted products have confidence >= 90%
    
    const minSubmissions = 10;
    const minApprovalRate = 0.90;
    const minConfidence = 90;

    this.logger.log(`[AUTO-APPROVE] Evaluating supplier ${supplier.id} — totalSubmissions: ${metrics?.totalSubmissions ?? 'N/A'}, approvedSubmissions: ${metrics?.approvedSubmissions ?? 'N/A'}`);

    if (!metrics || metrics.totalSubmissions < minSubmissions) {
      const reason = `Insufficient submission history (${metrics?.totalSubmissions ?? 0}/${minSubmissions} required)`;
      this.logger.log(`[AUTO-APPROVE] Not eligible — ${reason}`);
      return { eligible: false, reason };
    }

    const approvalRate = metrics.approvedSubmissions / metrics.totalSubmissions;
    if (approvalRate < minApprovalRate) {
      const reason = `Approval rate too low: ${(approvalRate * 100).toFixed(1)}% (min ${minApprovalRate * 100}%)`;
      this.logger.log(`[AUTO-APPROVE] Not eligible — ${reason}`);
      return { eligible: false, reason };
    }

    // Check confidence scores of all extracted products
    const confidenceScores = submission.extractedData.map(p => p.confidenceScore);
    const allHighConfidence = confidenceScores.every(score => score >= minConfidence);
    this.logger.log(`[AUTO-APPROVE] Confidence scores: [${confidenceScores.join(', ')}] — allHighConfidence: ${allHighConfidence}`);

    if (!allHighConfidence) {
      const reason = `One or more products have low confidence scores (min ${minConfidence}%)`;
      this.logger.log(`[AUTO-APPROVE] Not eligible — ${reason}`);
      return { eligible: false, reason };
    }

    const reason = `Trusted supplier with ${metrics.totalSubmissions} submissions and ${(approvalRate * 100).toFixed(1)}% approval rate`;
    this.logger.log(`[AUTO-APPROVE] Eligible — ${reason}`);
    return { eligible: true, reason };
  }

  /**
   * Auto-approve a submission and integrate with inventory
   */
  private async autoApproveSubmission(submission: SupplierSubmission, reason: string): Promise<void> {
    try {
      this.logger.log(`[AUTO-APPROVE] Processing ${submission.extractedData.length} product(s) for submission ${submission.id}`);

      // Process each extracted product
      for (let i = 0; i < submission.extractedData.length; i++) {
        const extractedProduct = submission.extractedData[i];

        this.logger.log(`[AUTO-APPROVE] Integrating product ${i + 1}/${submission.extractedData.length} — name: "${extractedProduct.name}", confidence: ${extractedProduct.confidenceScore}`);

        // Create validated product
        const validatedProduct = {
          ...extractedProduct,
          validatedBy: 'system-auto-approval',
          validatedAt: new Date(),
          approvalNotes: `Auto-approved: ${reason}`,
        };

        // Integrate with inventory
        await this.inventoryIntegrationService.createProductFromValidation(
          validatedProduct,
          submission.supplier.id,
          submission.id,
        );

        this.logger.log(`[AUTO-APPROVE] Product ${i + 1}/${submission.extractedData.length} integrated into inventory`);
      }

      // Update submission status
      submission.validationStatus = 'approved';
      submission.validatedBy = 'system-auto-approval';
      submission.validationNotes = `Auto-approved: ${reason}`;
      await this.submissionRepository.save(submission);

      this.logger.log(`[AUTO-APPROVE] Submission ${submission.id} marked as approved`);

      // Log the auto-approval
      await this.auditService.logAction({
        action: AuditAction.AUTO_APPROVE,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submission.id,
        severity: AuditSeverity.MEDIUM,
        description: `Submission auto-approved and integrated with inventory`,
        metadata: {
          submissionId: submission.id,
          supplierId: submission.supplier.id,
          reason,
          productsCount: submission.extractedData.length,
        },
        success: true,
      });

    } catch (error) {
      this.logger.error(`[AUTO-APPROVE] FAILED for submission ${submission.id}: ${error.message}`, error.stack);
      
      // Log the failure
      await this.auditService.logAction({
        action: AuditAction.AUTO_APPROVE,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submission.id,
        severity: AuditSeverity.HIGH,
        description: `Auto-approval failed: ${error.message}`,
        metadata: {
          submissionId: submission.id,
          supplierId: submission.supplier.id,
          error: error.message,
        },
        success: false,
      });

      throw error;
    }
  }

  /**
   * Scheduled job to process pending submissions
   * Runs every 5 minutes to check for new submissions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingSubmissions(): Promise<void> {
    try {
      this.logger.log('[CRON] processPendingSubmissions — checking for pending submissions');

      const pendingSubmissions = await this.submissionRepository.find({
        where: { processingStatus: 'pending' },
        relations: ['supplier'],
        order: { createdAt: 'ASC' },
        take: 10, // Process up to 10 submissions at a time
      });

      if (pendingSubmissions.length === 0) {
        this.logger.log('[CRON] No pending submissions found');
        return;
      }

      this.logger.log(`[CRON] Found ${pendingSubmissions.length} pending submission(s) — processing batch`);

      let successCount = 0;
      let failCount = 0;

      for (const submission of pendingSubmissions) {
        try {
          this.logger.log(`[CRON] Processing submission ${submission.id} (supplier: ${submission.supplier.name})`);
          await this.processSubmissionPipeline(submission.id);
          successCount++;
        } catch (error) {
          failCount++;
          this.logger.error(`[CRON] Failed to process submission ${submission.id}: ${error.message}`);
          // Continue with next submission
        }
      }

      this.logger.log(`[CRON] Batch complete — success: ${successCount}, failed: ${failCount}`);
    } catch (error) {
      this.logger.error(`[CRON] processPendingSubmissions error: ${error.message}`, error.stack);
    }
  }

  /**
   * Scheduled job to check for stale validations
   * Runs every hour to send reminders for pending validations
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkStaleValidations(): Promise<void> {
    try {
      this.logger.log('[CRON] checkStaleValidations — scanning for validations pending > 24h');

      const staleThreshold = new Date();
      staleThreshold.setHours(staleThreshold.getHours() - 24); // 24 hours ago

      const staleSubmissions = await this.submissionRepository.find({
        where: {
          processingStatus: 'completed',
          validationStatus: 'pending',
        },
        relations: ['supplier'],
      });

      const staleCount = staleSubmissions.filter(
        submission => submission.createdAt < staleThreshold
      ).length;

      this.logger.log(`[CRON] checkStaleValidations — total pending validations: ${staleSubmissions.length}, stale (>24h): ${staleCount}`);

      if (staleCount > 0) {
        this.logger.warn(`[CRON] ${staleCount} validation(s) have been pending for more than 24 hours`);
        
        // Record as a warning in health monitoring
        await this.healthMonitoringService.recordCriticalError(
          'stale-validations',
          `${staleCount} validations have been pending for more than 24 hours`,
          'medium',
          { staleCount, threshold: '24 hours' }
        );
      } else {
        this.logger.log('[CRON] No stale validations found');
      }
    } catch (error) {
      this.logger.error(`[CRON] checkStaleValidations error: ${error.message}`, error.stack);
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<any> {
    const totalSubmissions = await this.submissionRepository.count();
    
    const pendingProcessing = await this.submissionRepository.count({
      where: { processingStatus: 'pending' },
    });

    const processingInProgress = await this.submissionRepository.count({
      where: { processingStatus: 'processing' },
    });

    const completedProcessing = await this.submissionRepository.count({
      where: { processingStatus: 'completed' },
    });

    const failedProcessing = await this.submissionRepository.count({
      where: { processingStatus: 'failed' },
    });

    const pendingValidation = await this.submissionRepository.count({
      where: {
        processingStatus: 'completed',
        validationStatus: 'pending',
      },
    });

    const approvedValidation = await this.submissionRepository.count({
      where: { validationStatus: 'approved' },
    });

    const rejectedValidation = await this.submissionRepository.count({
      where: { validationStatus: 'rejected' },
    });

    return {
      total: totalSubmissions,
      processing: {
        pending: pendingProcessing,
        inProgress: processingInProgress,
        completed: completedProcessing,
        failed: failedProcessing,
      },
      validation: {
        pending: pendingValidation,
        approved: approvedValidation,
        rejected: rejectedValidation,
      },
      approvalRate: totalSubmissions > 0 
        ? ((approvedValidation / totalSubmissions) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Manually trigger pipeline processing for a specific submission
   */
  async triggerPipelineProcessing(submissionId: string): Promise<void> {
    this.logger.log(`[PIPELINE] Manual trigger for submission ${submissionId}`);
    await this.processSubmissionPipeline(submissionId);
  }

  /**
   * Reprocess a failed submission
   */
  async reprocessFailedSubmission(submissionId: string): Promise<void> {
    this.logger.log(`[PIPELINE] Reprocess requested for submission ${submissionId}`);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['supplier'],
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    if (submission.processingStatus !== 'failed') {
      throw new Error(`Submission ${submissionId} is not in failed status`);
    }

    // Reset status to pending
    submission.processingStatus = 'pending';
    submission.extractedData = null;
    await this.submissionRepository.save(submission);

    this.logger.log(`[PIPELINE] Submission ${submissionId} reset to 'pending' for reprocessing`);

    // Trigger pipeline processing
    await this.processSubmissionPipeline(submissionId);
  }
}
