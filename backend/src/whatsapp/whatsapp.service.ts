import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService, MediaFile } from './media-storage.service';
import { MessageGroupingService } from './message-grouping.service';
import { AIProcessingService } from '../ai-processing/ai-processing.service';
import { ErrorRecoveryService } from './error-recovery.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';
import * as crypto from 'crypto';

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: { phone_number_id: string };
    messages?: WhatsAppMessage[];
    statuses?: MessageStatus[];
  };
  field: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename: string };
  audio?: { id: string; mime_type: string; sha256: string };
}

export interface MessageStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export interface ProcessingResult {
  processed: boolean;
  submissionId?: string;
  processingTime: number;
  supplierAuthenticated: boolean;
  error?: string;
}

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(SupplierSubmission)
    private submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(ProcessingLog)
    private processingLogRepository: Repository<ProcessingLog>,
    private suppliersService: SuppliersService,
    private auditService: AuditService,
    private mediaStorageService: MediaStorageService,
    private messageGroupingService: MessageGroupingService,
    private aiProcessingService: AIProcessingService,
    private errorRecoveryService: ErrorRecoveryService,
    private healthMonitoringService: HealthMonitoringService,
  ) {}

  validateWebhookSignature(signature: string, payload: string): boolean {
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('WHATSAPP_WEBHOOK_SECRET not configured');
    }

    // Ensure signature is provided
    if (!signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');
      
      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature validation error:', error.message);
      return false;
    }
  }

  async processIncomingMessage(payload: WhatsAppWebhookPayload): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Extract message from payload
      const message = this.extractMessageFromPayload(payload);
      if (!message) {
        return {
          processed: false,
          processingTime: Date.now() - startTime,
          supplierAuthenticated: false,
          error: 'No valid message found in payload',
        };
      }

      // Enhanced supplier authentication (Requirements 5.1, 5.3)
      const supplier = await this.authenticateSupplier(message.from);
      if (!supplier) {
        await this.auditService.logAction({
          action: AuditAction.ACCESS_DENIED,
          resource: AuditResource.SUPPLIER,
          description: `Unauthorized WhatsApp message from ${message.from}`,
          metadata: { phoneNumber: message.from, messageId: message.id },
        });

        return {
          processed: false,
          processingTime: Date.now() - startTime,
          supplierAuthenticated: false,
          error: 'Supplier not registered or inactive',
        };
      }

      // Check for message grouping (Requirement 1.5)
      const messageTimestamp = new Date(parseInt(message.timestamp) * 1000);
      const existingGroup = await this.messageGroupingService.shouldGroupWithExisting(
        supplier.id, 
        messageTimestamp
      );

      // Create submission record
      const submission = await this.createSubmission(supplier.id, message);

      // Log processing start
      await this.logProcessingStage(submission.id, 'webhook', 'started', Date.now() - startTime, null, {
        groupedWith: existingGroup?.id,
        messageType: message.type,
        hasMedia: !!submission.mediaUrl,
      });

      // Log successful webhook processing
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submission.id,
        description: `WhatsApp message received from supplier ${supplier.name}`,
        metadata: {
          supplierId: supplier.id,
          supplierName: supplier.name,
          messageType: message.type,
          messageId: message.id,
          groupedWith: existingGroup?.id,
          phoneNumber: message.from,
        },
      });

      // Update supplier metrics
      await this.updateSupplierActivity(supplier.id);

      // Log processing completion
      await this.logProcessingStage(submission.id, 'webhook', 'completed', Date.now() - startTime);

      return {
        processed: true,
        submissionId: submission.id,
        processingTime: Date.now() - startTime,
        supplierAuthenticated: true,
      };

    } catch (error) {
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        description: `WhatsApp webhook processing failed: ${error.message}`,
        metadata: { error: error.message, payload },
      });

      return {
        processed: false,
        processingTime: Date.now() - startTime,
        supplierAuthenticated: false,
        error: error.message,
      };
    }
  }

  private extractMessageFromPayload(payload: WhatsAppWebhookPayload): WhatsAppMessage | null {
    if (!payload.entry || payload.entry.length === 0) {
      return null;
    }

    for (const entry of payload.entry) {
      if (!entry.changes || entry.changes.length === 0) {
        continue;
      }

      for (const change of entry.changes) {
        if (change.value.messages && change.value.messages.length > 0) {
          return change.value.messages[0]; // Return first message
        }
      }
    }

    return null;
  }

  private async createSubmission(supplierId: string, message: WhatsAppMessage): Promise<SupplierSubmission> {
    const contentType = this.mapMessageTypeToContentType(message.type);
    const originalContent = this.extractContentFromMessage(message);
    const mediaUrl = await this.extractMediaUrl(message);

    const submission = this.submissionRepository.create({
      supplier: { id: supplierId },
      whatsappMessageId: message.id,
      contentType,
      originalContent,
      mediaUrl,
      processingStatus: 'pending',
      validationStatus: 'pending',
    });

    return this.submissionRepository.save(submission);
  }

  private mapMessageTypeToContentType(messageType: string): 'text' | 'image' | 'pdf' | 'voice' {
    switch (messageType) {
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'document':
        return 'pdf'; // Assuming documents are PDFs for now
      case 'audio':
        return 'voice';
      default:
        return 'text';
    }
  }

  private extractContentFromMessage(message: WhatsAppMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return `Image: ${message.image?.id}`;
      case 'document':
        return `Document: ${message.document?.filename || message.document?.id}`;
      case 'audio':
        return `Audio: ${message.audio?.id}`;
      default:
        return '';
    }
  }

  private async extractMediaUrl(message: WhatsAppMessage): Promise<string | null> {
    // Download and store media files (Requirements 1.2, 1.3, 1.4, 8.2, 8.3)
    let mediaId: string | null = null;
    
    switch (message.type) {
      case 'image':
        mediaId = message.image?.id || null;
        break;
      case 'document':
        mediaId = message.document?.id || null;
        break;
      case 'audio':
        mediaId = message.audio?.id || null;
        break;
      default:
        return null;
    }

    if (!mediaId) {
      return null;
    }

    try {
      // Use retry logic for media download (Requirement 10.1)
      const result = await this.errorRecoveryService.executeWithRetry(
        () => this.mediaStorageService.downloadMediaFromWhatsApp(mediaId),
        `downloadMedia-${mediaId}`,
        { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 2 }
      );

      if (!result.success || !result.result) {
        throw new Error(`Media download failed after ${result.attempts} attempts`);
      }

      // Return the local file path for storage in the database
      return result.result.localPath;
    } catch (error) {
      console.error(`Failed to download media ${mediaId}:`, error.message);
      
      // Record critical error for monitoring (Requirement 10.4)
      await this.healthMonitoringService.recordCriticalError(
        'media-download',
        `Failed to download media ${mediaId}: ${error.message}`,
        'medium',
        { mediaId, messageId: message.id }
      );
      
      // Log the media download failure
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        description: `Media download failed for ${mediaId}: ${error.message}`,
        metadata: { mediaId, messageId: message.id, error: error.message },
      });

      // Return the media ID as fallback (will be processed later)
      return mediaId;
    }
  }

  private async logProcessingStage(
    submissionId: string,
    stage: 'webhook' | 'ai_extraction' | 'validation' | 'inventory_update',
    status: 'started' | 'completed' | 'failed',
    processingTimeMs: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const log = this.processingLogRepository.create({
      submission: { id: submissionId },
      processingStage: stage,
      processingStatus: status,
      processingTimeMs,
      errorMessage,
      metadata,
    });

    await this.processingLogRepository.save(log);
  }

  async getSubmissionById(id: string): Promise<SupplierSubmission | null> {
    return this.submissionRepository.findOne({
      where: { id },
      relations: ['supplier', 'processingLogs'],
    });
  }

  async getPendingSubmissions(): Promise<SupplierSubmission[]> {
    return this.submissionRepository.find({
      where: { processingStatus: 'pending' },
      relations: ['supplier'],
      order: { createdAt: 'ASC' },
    });
  }

  async getMediaFile(submissionId: string): Promise<MediaFile | null> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission || !submission.mediaUrl) {
      return null;
    }

    // If mediaUrl is a local path, create MediaFile object
    if (submission.mediaUrl.startsWith('./uploads/') || submission.mediaUrl.startsWith('/')) {
      return {
        id: submission.whatsappMessageId,
        originalName: submission.mediaUrl.split('/').pop() || '',
        mimeType: this.getMimeTypeFromContentType(submission.contentType),
        size: 0, // Would need to read file stats
        localPath: submission.mediaUrl,
        sha256: '',
        downloadedAt: submission.createdAt,
      };
    }

    // If mediaUrl is still a media ID, try to get stored file
    return this.mediaStorageService.getStoredFile(submission.mediaUrl);
  }

  private getMimeTypeFromContentType(contentType: string): string {
    switch (contentType) {
      case 'image':
        return 'image/jpeg';
      case 'pdf':
        return 'application/pdf';
      case 'voice':
        return 'audio/ogg';
      default:
        return 'application/octet-stream';
    }
  }

  private async authenticateSupplier(phoneNumber: string): Promise<any> {
    // Enhanced supplier authentication (Requirements 5.1, 5.3)
    const supplier = await this.suppliersService.findByPhoneNumber(phoneNumber);
    
    if (!supplier) {
      return null;
    }

    // Check if supplier is active
    if (!supplier.isActive) {
      await this.auditService.logAction({
        action: AuditAction.ACCESS_DENIED,
        resource: AuditResource.SUPPLIER,
        description: `Inactive supplier attempted to send message: ${phoneNumber}`,
        metadata: { phoneNumber, supplierId: supplier.id },
      });
      return null;
    }

    // Additional authentication checks could be added here
    // e.g., rate limiting per supplier, time-based restrictions, etc.

    return supplier;
  }

  private async updateSupplierActivity(supplierId: string): Promise<void> {
    try {
      const supplier = await this.suppliersService.findOne(supplierId);
      
      // Update performance metrics
      const updatedMetrics = {
        ...supplier.performanceMetrics,
        totalSubmissions: (supplier.performanceMetrics?.totalSubmissions || 0) + 1,
        lastSubmissionDate: new Date(),
      };

      await this.suppliersService.updateMetrics(supplierId, updatedMetrics);
    } catch (error) {
      console.error('Failed to update supplier activity:', error);
      // Don't throw error as this is not critical for message processing
    }
  }

  async getMessageGroups(supplierId?: string, limit?: number) {
    return this.messageGroupingService.getMessageGroups(supplierId, limit);
  }

  async getSubmissionStats(supplierId?: string) {
    return this.messageGroupingService.getSubmissionStats(supplierId);
  }

  async processSubmissionWithAI(submissionId: string): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['supplier'],
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    if (submission.processingStatus !== 'pending') {
      throw new Error(`Submission ${submissionId} is not in pending status`);
    }

    const startTime = Date.now();

    try {
      // Use transaction for database operations (Requirement 10.3)
      await this.errorRecoveryService.executeInTransaction(
        async (queryRunner) => {
          // Update status to processing
          submission.processingStatus = 'processing';
          await queryRunner.manager.save(submission);

          // Log AI processing start
          await this.logProcessingStage(submissionId, 'ai_extraction', 'started', 0);

          let extractedProducts = [];

          // Process based on content type with retry logic (Requirement 10.1)
          const result = await this.errorRecoveryService.executeWithRetry(
            async () => {
              switch (submission.contentType) {
                case 'text':
                  return await this.aiProcessingService.processTextMessage(
                    submission.originalContent,
                    submission.supplier
                  );
                case 'image':
                  if (submission.mediaUrl) {
                    return await this.aiProcessingService.processImage(
                      submission.mediaUrl,
                      submission.supplier
                    );
                  }
                  return [];
                case 'pdf':
                  if (submission.mediaUrl) {
                    return await this.aiProcessingService.processPDF(
                      submission.mediaUrl,
                      submission.supplier
                    );
                  }
                  return [];
                default:
                  throw new Error(`Unsupported content type: ${submission.contentType}`);
              }
            },
            `aiProcessing-${submissionId}`,
            { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2 }
          );

          if (!result.success) {
            throw result.error || new Error('AI processing failed');
          }

          extractedProducts = result.result || [];

          // Store extracted data
          submission.extractedData = extractedProducts;
          submission.processingStatus = 'completed';
          await queryRunner.manager.save(submission);

          const processingTime = Date.now() - startTime;

          // Log successful AI processing
          await this.logProcessingStage(submissionId, 'ai_extraction', 'completed', processingTime, null, {
            extractedProductsCount: extractedProducts.length,
            averageConfidence: extractedProducts.length > 0 
              ? extractedProducts.reduce((sum, p) => sum + p.confidenceScore, 0) / extractedProducts.length 
              : 0,
            retryAttempts: result.attempts - 1,
          });

          // Log audit trail
          await this.auditService.logAction({
            action: AuditAction.SUPPLIER_SUBMISSION,
            resource: AuditResource.SUPPLIER_SUBMISSION,
            resourceId: submissionId,
            description: `AI processing completed for submission from ${submission.supplier.name}`,
            metadata: {
              supplierId: submission.supplier.id,
              contentType: submission.contentType,
              extractedProductsCount: extractedProducts.length,
              processingTime,
              retryAttempts: result.attempts - 1,
            },
          });
        },
        `processSubmissionWithAI-${submissionId}`
      );

    } catch (error) {
      // Update status to failed
      submission.processingStatus = 'failed';
      await this.submissionRepository.save(submission);

      const processingTime = Date.now() - startTime;

      // Log failed AI processing
      await this.logProcessingStage(submissionId, 'ai_extraction', 'failed', processingTime, error.message);

      // Queue for retry (Requirement 10.2)
      await this.errorRecoveryService.queueFailedOperation(
        'ai_extraction',
        error,
        submissionId,
        {
          contentType: submission.contentType,
          supplierId: submission.supplier.id,
        }
      );

      // Record critical error (Requirement 10.4)
      await this.healthMonitoringService.recordCriticalError(
        'ai-processing',
        `AI processing failed for submission ${submissionId}: ${error.message}`,
        'high',
        {
          submissionId,
          contentType: submission.contentType,
          supplierId: submission.supplier.id,
        }
      );

      // Log audit trail
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_SUBMISSION,
        resource: AuditResource.SUPPLIER_SUBMISSION,
        resourceId: submissionId,
        description: `AI processing failed for submission: ${error.message}`,
        metadata: {
          supplierId: submission.supplier.id,
          contentType: submission.contentType,
          error: error.message,
          processingTime,
        },
      });

      throw error;
    }
  }

  async initializeAIProcessing(): Promise<void> {
    try {
      await this.aiProcessingService.initializeLocalModel();
    } catch (error) {
      console.error('Failed to initialize AI processing:', error.message);
      // Don't throw error as the service can still work with rule-based extraction
    }
  }
}