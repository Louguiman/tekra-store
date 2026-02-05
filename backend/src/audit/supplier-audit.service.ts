import { Injectable, Logger } from '@nestjs/common';
import { AuditService, AuditLogData } from './audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

export interface SupplierAuditContext {
  supplierId?: string;
  submissionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface SupplierSubmissionAuditData {
  submissionId: string;
  supplierId: string;
  contentType: 'text' | 'image' | 'pdf' | 'voice';
  whatsappMessageId: string;
  processingStatus: string;
  metadata?: Record<string, any>;
}

export interface AIProcessingAuditData {
  submissionId: string;
  supplierId: string;
  extractedProductsCount: number;
  averageConfidenceScore: number;
  processingTimeMs: number;
  aiModel: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ValidationAuditData {
  submissionId: string;
  supplierId: string;
  validatorId: string;
  action: 'approve' | 'reject' | 'bulk_approve' | 'bulk_reject';
  productCount: number;
  edits?: Record<string, any>;
  feedback?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface InventoryIntegrationAuditData {
  submissionId: string;
  supplierId: string;
  productId?: string;
  inventoryItemId?: string;
  action: 'create' | 'update';
  changes?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SupplierAuditService {
  private readonly logger = new Logger(SupplierAuditService.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Log supplier registration
   */
  async logSupplierRegistration(
    supplierId: string,
    supplierData: {
      name: string;
      phoneNumber: string;
      countryCode: string;
      email?: string;
    },
    context: SupplierAuditContext,
  ): Promise<void> {
    await this.auditService.logAction({
      userId: context.userId,
      action: AuditAction.SUPPLIER_REGISTRATION,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      severity: AuditSeverity.MEDIUM,
      description: `Supplier registered: ${supplierData.name} (${supplierData.phoneNumber})`,
      metadata: {
        supplierData,
        countryCode: supplierData.countryCode,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success: true,
    });
  }

  /**
   * Log supplier authentication attempt
   */
  async logSupplierAuthentication(
    phoneNumber: string,
    supplierId: string | null,
    success: boolean,
    context: SupplierAuditContext,
    errorMessage?: string,
  ): Promise<void> {
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_AUTHENTICATION,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId || undefined,
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      description: success
        ? `Supplier authenticated: ${phoneNumber}`
        : `Failed supplier authentication: ${phoneNumber}`,
      metadata: {
        phoneNumber,
        supplierId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success,
      errorMessage,
    });
  }

  /**
   * Log supplier submission received
   */
  async logSupplierSubmission(
    data: SupplierSubmissionAuditData,
    context: SupplierAuditContext,
  ): Promise<void> {
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: data.submissionId,
      severity: AuditSeverity.LOW,
      description: `Supplier submission received: ${data.contentType} from supplier ${data.supplierId}`,
      metadata: {
        supplierId: data.supplierId,
        contentType: data.contentType,
        whatsappMessageId: data.whatsappMessageId,
        processingStatus: data.processingStatus,
        ...data.metadata,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: true,
    });
  }

  /**
   * Log AI processing completion
   */
  async logAIProcessing(
    data: AIProcessingAuditData,
    context: SupplierAuditContext,
  ): Promise<void> {
    await this.auditService.logAction({
      action: AuditAction.AI_PROCESSING,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: data.submissionId,
      severity: data.success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      description: data.success
        ? `AI processing completed: ${data.extractedProductsCount} products extracted`
        : `AI processing failed for submission ${data.submissionId}`,
      metadata: {
        supplierId: data.supplierId,
        extractedProductsCount: data.extractedProductsCount,
        averageConfidenceScore: data.averageConfidenceScore,
        processingTimeMs: data.processingTimeMs,
        aiModel: data.aiModel,
        ...data.metadata,
      },
      success: data.success,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Log human validation action
   */
  async logValidation(
    data: ValidationAuditData,
    context: SupplierAuditContext,
  ): Promise<void> {
    const actionMap = {
      approve: AuditAction.APPROVE,
      reject: AuditAction.REJECT,
      bulk_approve: AuditAction.BULK_APPROVE,
      bulk_reject: AuditAction.BULK_REJECT,
    };

    await this.auditService.logAction({
      userId: data.validatorId,
      action: actionMap[data.action],
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: data.submissionId,
      severity: AuditSeverity.MEDIUM,
      description: `Validation ${data.action}: ${data.productCount} product(s) from supplier ${data.supplierId}`,
      metadata: {
        supplierId: data.supplierId,
        validatorId: data.validatorId,
        productCount: data.productCount,
        edits: data.edits,
        feedback: data.feedback,
        ...data.metadata,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success: true,
    });
  }

  /**
   * Log inventory integration
   */
  async logInventoryIntegration(
    data: InventoryIntegrationAuditData,
    context: SupplierAuditContext,
  ): Promise<void> {
    await this.auditService.logAction({
      userId: context.userId,
      action: AuditAction.INVENTORY_INTEGRATION,
      resource: AuditResource.INVENTORY,
      resourceId: data.inventoryItemId || data.productId,
      severity: data.success ? AuditSeverity.MEDIUM : AuditSeverity.HIGH,
      description: data.success
        ? `Inventory ${data.action}: Product ${data.productId || 'new'} from submission ${data.submissionId}`
        : `Inventory integration failed for submission ${data.submissionId}`,
      metadata: {
        submissionId: data.submissionId,
        supplierId: data.supplierId,
        productId: data.productId,
        inventoryItemId: data.inventoryItemId,
        action: data.action,
        changes: data.changes,
        ...data.metadata,
      },
      success: data.success,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Get audit trail for a specific supplier
   */
  async getSupplierAuditTrail(
    supplierId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      actions?: AuditAction[];
      page?: number;
      limit?: number;
    },
  ) {
    const baseFilters: any = {
      page: filters?.page || 1,
      limit: filters?.limit || 50,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    };

    // Get all audit logs related to this supplier
    const result = await this.auditService.getAuditLogs({
      ...baseFilters,
      resource: AuditResource.SUPPLIER,
    });

    // Filter by supplier ID in metadata
    const filteredLogs = result.logs.filter(
      log => log.resourceId === supplierId || log.metadata?.supplierId === supplierId,
    );

    // Apply action filter if provided
    const finalLogs = filters?.actions
      ? filteredLogs.filter(log => filters.actions.includes(log.action))
      : filteredLogs;

    return {
      logs: finalLogs,
      total: finalLogs.length,
      page: baseFilters.page,
      limit: baseFilters.limit,
      totalPages: Math.ceil(finalLogs.length / baseFilters.limit),
    };
  }

  /**
   * Get audit trail for a specific submission
   */
  async getSubmissionAuditTrail(submissionId: string) {
    const result = await this.auditService.getAuditLogs({
      resource: AuditResource.SUPPLIER_SUBMISSION,
      page: 1,
      limit: 100,
    });

    const submissionLogs = result.logs.filter(
      log => log.resourceId === submissionId || log.metadata?.submissionId === submissionId,
    );

    return {
      logs: submissionLogs,
      total: submissionLogs.length,
    };
  }

  /**
   * Get supplier automation statistics
   */
  async getSupplierAutomationStatistics(startDate?: Date, endDate?: Date) {
    const baseStats = await this.auditService.getAuditStatistics(startDate, endDate);

    // Filter for supplier-related actions
    const supplierActions = [
      AuditAction.SUPPLIER_REGISTRATION,
      AuditAction.SUPPLIER_AUTHENTICATION,
      AuditAction.SUPPLIER_SUBMISSION,
      AuditAction.AI_PROCESSING,
      AuditAction.HUMAN_VALIDATION,
      AuditAction.INVENTORY_INTEGRATION,
      AuditAction.APPROVE,
      AuditAction.REJECT,
      AuditAction.BULK_APPROVE,
      AuditAction.BULK_REJECT,
    ];

    const supplierActionStats = baseStats.actionStats.filter(stat =>
      supplierActions.includes(stat.action as AuditAction),
    );

    const totalSupplierActions = supplierActionStats.reduce(
      (sum, stat) => sum + stat.count,
      0,
    );

    return {
      totalSupplierActions,
      actionBreakdown: supplierActionStats,
      supplierResourceStats: baseStats.resourceStats.filter(
        stat =>
          stat.resource === AuditResource.SUPPLIER ||
          stat.resource === AuditResource.SUPPLIER_SUBMISSION,
      ),
      severityDistribution: baseStats.severityStats,
      successRate: baseStats.successRate,
    };
  }

  /**
   * Get validation performance metrics
   */
  async getValidationMetrics(startDate?: Date, endDate?: Date) {
    const result = await this.auditService.getAuditLogs({
      startDate,
      endDate,
      page: 1,
      limit: 10000, // Get all for statistics
    });

    const validationLogs = result.logs.filter(log =>
      [
        AuditAction.APPROVE,
        AuditAction.REJECT,
        AuditAction.BULK_APPROVE,
        AuditAction.BULK_REJECT,
      ].includes(log.action),
    );

    const approvals = validationLogs.filter(log =>
      [AuditAction.APPROVE, AuditAction.BULK_APPROVE].includes(log.action),
    );

    const rejections = validationLogs.filter(log =>
      [AuditAction.REJECT, AuditAction.BULK_REJECT].includes(log.action),
    );

    const totalProducts = validationLogs.reduce(
      (sum, log) => sum + (log.metadata?.productCount || 1),
      0,
    );

    const approvedProducts = approvals.reduce(
      (sum, log) => sum + (log.metadata?.productCount || 1),
      0,
    );

    const rejectedProducts = rejections.reduce(
      (sum, log) => sum + (log.metadata?.productCount || 1),
      0,
    );

    // Get unique validators
    const validators = new Set(validationLogs.map(log => log.userId).filter(Boolean));

    return {
      totalValidations: validationLogs.length,
      totalProducts,
      approvedProducts,
      rejectedProducts,
      approvalRate: totalProducts > 0 ? (approvedProducts / totalProducts) * 100 : 0,
      rejectionRate: totalProducts > 0 ? (rejectedProducts / totalProducts) * 100 : 0,
      uniqueValidators: validators.size,
      averageProductsPerValidation: validationLogs.length > 0 ? totalProducts / validationLogs.length : 0,
    };
  }

  /**
   * Get AI processing performance metrics
   */
  async getAIProcessingMetrics(startDate?: Date, endDate?: Date) {
    const result = await this.auditService.getAuditLogs({
      action: AuditAction.AI_PROCESSING,
      startDate,
      endDate,
      page: 1,
      limit: 10000,
    });

    const processingLogs = result.logs;

    const successfulProcessing = processingLogs.filter(log => log.success);
    const failedProcessing = processingLogs.filter(log => !log.success);

    const totalProcessingTime = processingLogs.reduce(
      (sum, log) => sum + (log.metadata?.processingTimeMs || 0),
      0,
    );

    const totalProductsExtracted = processingLogs.reduce(
      (sum, log) => sum + (log.metadata?.extractedProductsCount || 0),
      0,
    );

    const confidenceScores = processingLogs
      .map(log => log.metadata?.averageConfidenceScore)
      .filter(score => score !== undefined);

    const averageConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
        : 0;

    return {
      totalProcessingRuns: processingLogs.length,
      successfulRuns: successfulProcessing.length,
      failedRuns: failedProcessing.length,
      successRate: processingLogs.length > 0 ? (successfulProcessing.length / processingLogs.length) * 100 : 0,
      totalProductsExtracted,
      averageProductsPerRun: processingLogs.length > 0 ? totalProductsExtracted / processingLogs.length : 0,
      averageProcessingTimeMs: processingLogs.length > 0 ? totalProcessingTime / processingLogs.length : 0,
      averageConfidenceScore: averageConfidence,
    };
  }
}
