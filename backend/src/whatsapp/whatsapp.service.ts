import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AuditService } from '../audit/audit.service';
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
  ) {}

  validateWebhookSignature(signature: string, payload: string): boolean {
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('WHATSAPP_WEBHOOK_SECRET not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
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

      // Authenticate supplier
      const supplier = await this.suppliersService.findByPhoneNumber(message.from);
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
          error: 'Supplier not registered',
        };
      }

      // Create submission record
      const submission = await this.createSubmission(supplier.id, message);

      // Log processing start
      await this.logProcessingStage(submission.id, 'webhook', 'started', Date.now() - startTime);

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
        },
      });

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
    // In a real implementation, this would download the media from WhatsApp API
    // For now, we'll just store the media ID
    switch (message.type) {
      case 'image':
        return message.image?.id || null;
      case 'document':
        return message.document?.id || null;
      case 'audio':
        return message.audio?.id || null;
      default:
        return null;
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
}