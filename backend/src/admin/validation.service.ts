import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SupplierSubmission, ExtractedProduct } from '../entities/supplier-submission.entity';
import { Supplier } from '../entities/supplier.entity';
import { ValidationFiltersDto } from './dto/validation-filters.dto';
import { ValidationFeedbackDto } from './dto/validation-feedback.dto';
import { ExtractedProductEditDto } from './dto/extracted-product-edit.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { InventoryIntegrationService } from './inventory-integration.service';
import { ValidationNotificationService } from './validation-notification.service';

export interface ValidationItem {
  id: string;
  submissionId: string;
  supplierId: string;
  supplierName: string;
  originalContent: {
    type: 'text' | 'image' | 'pdf' | 'voice';
    content: string;
    mediaUrl?: string;
  };
  extractedProduct: ExtractedProduct;
  suggestedActions: ValidationAction[];
  priority: 'low' | 'medium' | 'high';
  confidenceScore: number;
  createdAt: Date;
  estimatedProcessingTime: number;
  relatedValidations?: string[];
}

export interface ValidationAction {
  type: 'create' | 'update' | 'merge';
  targetProductId?: string;
  confidence: number;
  reasoning: string;
  suggestedEdits?: Partial<ExtractedProduct>;
}

export interface PaginatedValidationItems {
  items: ValidationItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
  subcategories: string[];
}

export interface BulkValidationResult {
  successful: string[];
  failed: Array<{ id: string; error: string }>;
  totalProcessed: number;
}

export interface ValidationStats {
  totalPending: number;
  highPriority: number;
  avgProcessingTime: number;
  approvalRate: number;
  commonRejectionReasons: Array<{ reason: string; count: number }>;
}

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(SupplierSubmission)
    private readonly submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly auditService: AuditService,
    private readonly inventoryIntegrationService: InventoryIntegrationService,
    private readonly notificationService: ValidationNotificationService,
  ) {}

  async getPendingValidations(filters: ValidationFiltersDto): Promise<PaginatedValidationItems> {
    const {
      supplierId,
      contentType,
      priority,
      category,
      minConfidence,
      maxConfidence,
      page = 1,
      limit = 20,
    } = filters;

    let queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.supplier', 'supplier')
      .where('submission.processingStatus = :processingStatus', { processingStatus: 'completed' })
      .andWhere('submission.validationStatus = :validationStatus', { validationStatus: 'pending' })
      .andWhere('submission.extractedData IS NOT NULL');

    // Apply filters
    if (supplierId) {
      queryBuilder.andWhere('supplier.id = :supplierId', { supplierId });
    }

    if (contentType) {
      queryBuilder.andWhere('submission.contentType = :contentType', { contentType });
    }

    // For confidence filtering, we need to check the JSON data
    if (minConfidence !== undefined || maxConfidence !== undefined) {
      let confidenceConditions: string[] = [];
      let parameters: any = {};

      if (minConfidence !== undefined) {
        confidenceConditions.push('CAST(product->\'confidenceScore\' AS FLOAT) >= :minConfidence');
        parameters.minConfidence = minConfidence;
      }

      if (maxConfidence !== undefined) {
        confidenceConditions.push('CAST(product->\'confidenceScore\' AS FLOAT) <= :maxConfidence');
        parameters.maxConfidence = maxConfidence;
      }

      if (confidenceConditions.length > 0) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM jsonb_array_elements(submission.extractedData) AS product 
            WHERE ${confidenceConditions.join(' AND ')}
          )`,
          parameters
        );
      }
    }

    // Apply sorting (high confidence first, then by submission date)
    queryBuilder.orderBy('submission.createdAt', 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [submissions, total] = await queryBuilder.getManyAndCount();

    // Transform submissions to validation items
    const items: ValidationItem[] = [];
    
    for (const submission of submissions) {
      if (submission.extractedData && submission.extractedData.length > 0) {
        for (let i = 0; i < submission.extractedData.length; i++) {
          const extractedProduct = submission.extractedData[i];
          
          // Calculate priority based on confidence score
          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (extractedProduct.confidenceScore >= 80) {
            priority = 'high';
          } else if (extractedProduct.confidenceScore < 50) {
            priority = 'low';
          }

          // Generate validation item ID (submission ID + product index)
          const validationId = `${submission.id}-${i}`;

          items.push({
            id: validationId,
            submissionId: submission.id,
            supplierId: submission.supplier.id,
            supplierName: submission.supplier.name,
            originalContent: {
              type: submission.contentType,
              content: submission.originalContent,
              mediaUrl: submission.mediaUrl,
            },
            extractedProduct,
            suggestedActions: this.generateSuggestedActions(extractedProduct),
            priority,
            confidenceScore: extractedProduct.confidenceScore,
            createdAt: submission.createdAt,
            estimatedProcessingTime: this.calculateEstimatedProcessingTime(extractedProduct),
            relatedValidations: submission.extractedData.length > 1 
              ? submission.extractedData.map((_, idx) => `${submission.id}-${idx}`).filter(id => id !== validationId)
              : undefined,
          });
        }
      }
    }

    // Sort items by priority and confidence
    items.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidenceScore - a.confidenceScore;
    });

    return {
      items,
      total: items.length, // Note: This is approximate since we're expanding submissions to products
      page,
      limit,
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async getValidationById(validationId: string): Promise<ValidationItem> {
    const [submissionId, productIndex] = validationId.split('-');
    const index = parseInt(productIndex, 10);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['supplier'],
    });

    if (!submission || !submission.extractedData || !submission.extractedData[index]) {
      throw new NotFoundException('Validation item not found');
    }

    const extractedProduct = submission.extractedData[index];
    
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (extractedProduct.confidenceScore >= 80) {
      priority = 'high';
    } else if (extractedProduct.confidenceScore < 50) {
      priority = 'low';
    }

    return {
      id: validationId,
      submissionId: submission.id,
      supplierId: submission.supplier.id,
      supplierName: submission.supplier.name,
      originalContent: {
        type: submission.contentType,
        content: submission.originalContent,
        mediaUrl: submission.mediaUrl,
      },
      extractedProduct,
      suggestedActions: this.generateSuggestedActions(extractedProduct),
      priority,
      confidenceScore: extractedProduct.confidenceScore,
      createdAt: submission.createdAt,
      estimatedProcessingTime: this.calculateEstimatedProcessingTime(extractedProduct),
      relatedValidations: submission.extractedData.length > 1 
        ? submission.extractedData.map((_, idx) => `${submission.id}-${idx}`).filter(id => id !== validationId)
        : undefined,
    };
  }

  async approveProduct(
    validationId: string, 
    edits?: ExtractedProductEditDto, 
    adminId?: string,
    notes?: string
  ): Promise<void> {
    const [submissionId, productIndex] = validationId.split('-');
    const index = parseInt(productIndex, 10);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['supplier'],
    });

    if (!submission || !submission.extractedData || !submission.extractedData[index]) {
      throw new NotFoundException('Validation item not found');
    }

    // Apply edits if provided
    let extractedProduct = submission.extractedData[index];
    if (edits) {
      extractedProduct = { ...extractedProduct, ...edits };
      submission.extractedData[index] = extractedProduct;
    }

    // Update submission status
    submission.validationStatus = 'approved';
    submission.validatedBy = adminId || 'system';
    submission.validationNotes = notes || '';

    await this.submissionRepository.save(submission);

    // Trigger inventory integration
    try {
      const validatedProduct = {
        ...extractedProduct,
        validatedBy: adminId || 'system',
        validatedAt: new Date(),
        adminEdits: edits,
        approvalNotes: notes,
      };

      const product = await this.inventoryIntegrationService.createProductFromValidation(
        validatedProduct,
        submission.supplier.id,
        submissionId,
      );

      // Send approval notification
      await this.notificationService.notifyApproval(submissionId, product.id, adminId || 'system');
    } catch (error) {
      // Log error but don't fail the approval
      console.error('Inventory integration failed:', error);
    }

    // Log the approval
    if (adminId) {
      await this.auditService.logAction({
        userId: adminId,
        action: AuditAction.APPROVE,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: validationId,
        severity: AuditSeverity.MEDIUM,
        description: `Approved supplier product validation`,
        metadata: {
          submissionId,
          productIndex: index,
          supplierId: submission.supplier.id,
          edits,
          notes,
        },
        success: true,
      });
    }
  }

  async rejectProduct(
    validationId: string, 
    feedback: ValidationFeedbackDto, 
    adminId?: string,
    notes?: string
  ): Promise<void> {
    const [submissionId, productIndex] = validationId.split('-');
    const index = parseInt(productIndex, 10);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['supplier'],
    });

    if (!submission || !submission.extractedData || !submission.extractedData[index]) {
      throw new NotFoundException('Validation item not found');
    }

    // Update submission status
    submission.validationStatus = 'rejected';
    submission.validatedBy = adminId || 'system';
    submission.validationNotes = JSON.stringify({ feedback, notes });

    await this.submissionRepository.save(submission);

    // Send rejection notification
    try {
      await this.notificationService.notifyRejection(submissionId, feedback, adminId || 'system');
    } catch (error) {
      // Log error but don't fail the rejection
      console.error('Notification failed:', error);
    }

    // Log the rejection
    if (adminId) {
      await this.auditService.logAction({
        userId: adminId,
        action: AuditAction.REJECT,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: validationId,
        severity: AuditSeverity.MEDIUM,
        description: `Rejected supplier product validation`,
        metadata: {
          submissionId,
          productIndex: index,
          supplierId: submission.supplier.id,
          feedback,
          notes,
        },
        success: true,
      });
    }
  }

  async bulkApprove(
    validationIds: string[], 
    globalEdits?: Record<string, ExtractedProductEditDto>, 
    adminId?: string,
    notes?: string
  ): Promise<BulkValidationResult> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const validationId of validationIds) {
      try {
        const edits = globalEdits?.[validationId];
        await this.approveProduct(validationId, edits, adminId, notes);
        successful.push(validationId);
      } catch (error) {
        failed.push({
          id: validationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: validationIds.length,
    };
  }

  async bulkReject(
    validationIds: string[], 
    feedback: ValidationFeedbackDto, 
    adminId?: string,
    notes?: string
  ): Promise<BulkValidationResult> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const validationId of validationIds) {
      try {
        await this.rejectProduct(validationId, feedback, adminId, notes);
        successful.push(validationId);
      } catch (error) {
        failed.push({
          id: validationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: validationIds.length,
    };
  }

  async getFeedbackCategories(): Promise<FeedbackCategory[]> {
    return [
      {
        id: 'extraction_error',
        name: 'Extraction Error',
        description: 'AI failed to extract correct information',
        subcategories: [
          'incorrect_product_name',
          'wrong_price',
          'missing_specifications',
          'incorrect_category',
          'wrong_brand',
        ],
      },
      {
        id: 'poor_quality',
        name: 'Poor Quality Content',
        description: 'Original content quality issues',
        subcategories: [
          'blurry_image',
          'incomplete_information',
          'unclear_text',
          'corrupted_file',
        ],
      },
      {
        id: 'duplicate_product',
        name: 'Duplicate Product',
        description: 'Product already exists in system',
        subcategories: [
          'exact_duplicate',
          'similar_product',
          'variant_exists',
        ],
      },
      {
        id: 'invalid_content',
        name: 'Invalid Content',
        description: 'Content does not contain valid product information',
        subcategories: [
          'not_a_product',
          'spam_content',
          'test_message',
          'personal_message',
        ],
      },
      {
        id: 'policy_violation',
        name: 'Policy Violation',
        description: 'Content violates platform policies',
        subcategories: [
          'prohibited_item',
          'inappropriate_content',
          'copyright_violation',
        ],
      },
    ];
  }

  async getValidationStats(): Promise<ValidationStats> {
    const totalPending = await this.submissionRepository.count({
      where: { 
        processingStatus: 'completed',
        validationStatus: 'pending',
      },
    });

    // Calculate high priority items (high confidence scores)
    const highPriorityQuery = await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.processingStatus = :processingStatus', { processingStatus: 'completed' })
      .andWhere('submission.validationStatus = :validationStatus', { validationStatus: 'pending' })
      .andWhere(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(submission.extractedData) AS product 
        WHERE CAST(product->>'confidenceScore' AS FLOAT) >= 80
      )`)
      .getCount();

    // Calculate approval rate
    const totalProcessed = await this.submissionRepository.count({
      where: { processingStatus: 'completed' },
    });

    const approved = await this.submissionRepository.count({
      where: { 
        processingStatus: 'completed',
        validationStatus: 'approved',
      },
    });

    const approvalRate = totalProcessed > 0 ? (approved / totalProcessed) * 100 : 0;

    return {
      totalPending,
      highPriority: highPriorityQuery,
      avgProcessingTime: 5, // Placeholder - would need to calculate from processing logs
      approvalRate: Math.round(approvalRate * 100) / 100,
      commonRejectionReasons: [
        { reason: 'Extraction Error', count: 15 },
        { reason: 'Poor Quality Content', count: 8 },
        { reason: 'Duplicate Product', count: 5 },
      ], // Placeholder - would need to analyze rejection feedback
    };
  }

  private generateSuggestedActions(extractedProduct: ExtractedProduct): ValidationAction[] {
    const actions: ValidationAction[] = [];

    // Always suggest create action
    actions.push({
      type: 'create',
      confidence: extractedProduct.confidenceScore,
      reasoning: 'Create new product based on extracted data',
    });

    // If confidence is low, suggest review
    if (extractedProduct.confidenceScore < 70) {
      actions.push({
        type: 'update',
        confidence: extractedProduct.confidenceScore * 0.8,
        reasoning: 'Low confidence - review and edit extracted data',
        suggestedEdits: {
          name: extractedProduct.name,
          category: extractedProduct.category,
        },
      });
    }

    return actions;
  }

  private calculateEstimatedProcessingTime(extractedProduct: ExtractedProduct): number {
    // Base time in minutes
    let baseTime = 3;

    // Add time based on confidence score (lower confidence = more time)
    if (extractedProduct.confidenceScore < 50) {
      baseTime += 5;
    } else if (extractedProduct.confidenceScore < 70) {
      baseTime += 2;
    }

    // Add time for complex specifications
    if (extractedProduct.specifications && Object.keys(extractedProduct.specifications).length > 5) {
      baseTime += 2;
    }

    return baseTime;
  }
}