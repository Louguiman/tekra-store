import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierTemplate } from '../entities/supplier-template.entity';
import { Supplier } from '../entities/supplier.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export interface TemplateUpdateNotification {
  templateId: string;
  templateName: string;
  oldVersion: number;
  newVersion: number;
  changes: string[];
  migrationGuidance: string;
  affectedSuppliers: string[];
}

@Injectable()
export class TemplateNotificationService {
  constructor(
    @InjectRepository(SupplierTemplate)
    private templateRepository: Repository<SupplierTemplate>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private auditService: AuditService,
  ) {}

  /**
   * Notify suppliers when a template is updated
   */
  async notifyTemplateUpdate(
    templateId: string,
    oldVersion: number,
    newVersion: number,
    changes: string[],
  ): Promise<TemplateUpdateNotification> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: ['supplier'],
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Get affected suppliers
    const affectedSuppliers = await this.getAffectedSuppliers(template);

    // Generate migration guidance
    const migrationGuidance = this.generateMigrationGuidance(changes);

    const notification: TemplateUpdateNotification = {
      templateId,
      templateName: template.name,
      oldVersion,
      newVersion,
      changes,
      migrationGuidance,
      affectedSuppliers: affectedSuppliers.map(s => s.id),
    };

    // Log notification
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: templateId,
      description: `Template update notification sent: ${template.name} v${oldVersion} → v${newVersion}`,
      metadata: {
        affectedSuppliers: affectedSuppliers.length,
        changes,
      },
    });

    // In a real implementation, this would send emails/SMS/WhatsApp messages
    // For now, we just log the notification
    console.log(`Template update notification:`, notification);

    return notification;
  }

  /**
   * Get suppliers affected by a template update
   */
  private async getAffectedSuppliers(template: SupplierTemplate): Promise<Supplier[]> {
    if (template.isGlobal) {
      // Global templates affect all active suppliers
      return this.supplierRepository.find({
        where: { isActive: true },
      });
    } else if (template.supplier) {
      // Supplier-specific template affects only that supplier
      return [template.supplier];
    }

    return [];
  }

  /**
   * Generate migration guidance based on changes
   */
  private generateMigrationGuidance(changes: string[]): string {
    const guidance: string[] = [
      'Template Update Migration Guide:',
      '',
    ];

    for (const change of changes) {
      if (change.includes('field added')) {
        guidance.push('• New fields have been added. Please include these in your future submissions.');
      } else if (change.includes('field removed')) {
        guidance.push('• Some fields have been removed. You no longer need to provide this information.');
      } else if (change.includes('validation changed')) {
        guidance.push('• Validation rules have been updated. Please review the new requirements.');
      } else if (change.includes('format changed')) {
        guidance.push('• The expected format has changed. Please review the updated example content.');
      } else {
        guidance.push(`• ${change}`);
      }
    }

    guidance.push('');
    guidance.push('Please review the updated template and adjust your submissions accordingly.');
    guidance.push('If you have any questions, please contact support.');

    return guidance.join('\n');
  }

  /**
   * Send template recommendation to supplier
   */
  async sendTemplateRecommendation(
    supplierId: string,
    templateId: string,
    reason: string,
  ): Promise<void> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Template recommendation sent: ${template.name}`,
      metadata: {
        templateId,
        templateName: template.name,
        reason,
      },
    });

    // In a real implementation, this would send a WhatsApp message
    console.log(`Template recommendation sent to ${supplier.name}: ${template.name} - ${reason}`);
  }

  /**
   * Notify supplier about validation feedback
   */
  async sendValidationFeedback(
    supplierId: string,
    templateId: string,
    feedback: string,
    suggestions: string[],
  ): Promise<void> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Validation feedback sent for template: ${template.name}`,
      metadata: {
        templateId,
        feedback,
        suggestions,
      },
    });

    // In a real implementation, this would send a WhatsApp message
    console.log(`Validation feedback sent to ${supplier.name}:`, {
      template: template.name,
      feedback,
      suggestions,
    });
  }
}
