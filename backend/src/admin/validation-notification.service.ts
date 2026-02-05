import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { User, UserRole } from '../entities/user.entity';

export interface ValidationReminder {
  validationId: string;
  submissionId: string;
  supplierId: string;
  pendingSince: Date;
  priority: 'low' | 'medium' | 'high';
  remindersSent: number;
}

@Injectable()
export class ValidationNotificationService {
  private readonly logger = new Logger(ValidationNotificationService.name);

  constructor(
    @InjectRepository(SupplierSubmission)
    private readonly submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendValidationNotifications(adminIds: string[]): Promise<void> {
    try {
      const admins = await this.userRepository.findByIds(adminIds);
      
      const pendingCount = await this.submissionRepository.count({
        where: {
          processingStatus: 'completed',
          validationStatus: 'pending',
        },
      });

      this.logger.log(`Sending validation notifications to ${admins.length} admins. Pending: ${pendingCount}`);

      // In a real implementation, this would send emails/SMS
      // For now, we just log the notification
      for (const admin of admins) {
        this.logger.log(`Notification sent to ${admin.email}: ${pendingCount} pending validations`);
      }
    } catch (error) {
      this.logger.error(`Failed to send validation notifications: ${error.message}`, error.stack);
    }
  }

  async getPendingReminders(): Promise<ValidationReminder[]> {
    try {
      // Find submissions pending for more than 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const submissions = await this.submissionRepository.find({
        where: {
          processingStatus: 'completed',
          validationStatus: 'pending',
          createdAt: LessThan(twentyFourHoursAgo),
        },
        relations: ['supplier'],
        order: { createdAt: 'ASC' },
      });

      const reminders: ValidationReminder[] = [];

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

            reminders.push({
              validationId: `${submission.id}-${i}`,
              submissionId: submission.id,
              supplierId: submission.supplier.id,
              pendingSince: submission.createdAt,
              priority,
              remindersSent: 0, // Would track this in a separate table in production
            });
          }
        }
      }

      return reminders;
    } catch (error) {
      this.logger.error(`Failed to get pending reminders: ${error.message}`, error.stack);
      return [];
    }
  }

  async sendReminderNotifications(): Promise<void> {
    try {
      const reminders = await this.getPendingReminders();

      if (reminders.length === 0) {
        this.logger.log('No pending reminders to send');
        return;
      }

      // Get all admin users
      const admins = await this.userRepository.find({
        where: [
          { role: UserRole.ADMIN },
          { role: UserRole.STAFF },
        ],
      });

      this.logger.log(`Sending ${reminders.length} reminder notifications to ${admins.length} admins`);

      // In a real implementation, this would send emails/SMS
      // For now, we just log the reminders
      for (const admin of admins) {
        const highPriorityCount = reminders.filter(r => r.priority === 'high').length;
        this.logger.log(
          `Reminder sent to ${admin.email}: ${reminders.length} pending validations (${highPriorityCount} high priority)`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send reminder notifications: ${error.message}`, error.stack);
    }
  }

  async notifyApproval(submissionId: string, productId: string, adminId: string): Promise<void> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['supplier'],
      });

      if (!submission) {
        this.logger.warn(`Submission not found for approval notification: ${submissionId}`);
        return;
      }

      this.logger.log(
        `Approval notification: Product ${productId} created from submission ${submissionId} by supplier ${submission.supplier.name}`
      );

      // In a real implementation, this would:
      // 1. Send notification to supplier (WhatsApp/SMS)
      // 2. Send notification to inventory managers
      // 3. Update dashboard in real-time
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${error.message}`, error.stack);
    }
  }

  async notifyRejection(submissionId: string, feedback: any, adminId: string): Promise<void> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['supplier'],
      });

      if (!submission) {
        this.logger.warn(`Submission not found for rejection notification: ${submissionId}`);
        return;
      }

      this.logger.log(
        `Rejection notification: Submission ${submissionId} from supplier ${submission.supplier.name} rejected. Reason: ${feedback.category}`
      );

      // In a real implementation, this would:
      // 1. Send feedback to supplier (WhatsApp/SMS)
      // 2. Provide guidance on how to improve future submissions
      // 3. Track rejection patterns for supplier performance metrics
    } catch (error) {
      this.logger.error(`Failed to send rejection notification: ${error.message}`, error.stack);
    }
  }
}