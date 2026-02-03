import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { 
  SendNotificationDto, 
  OrderStatusNotificationDto, 
  SupportContactDto,
  NotificationType,
  NotificationChannel 
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private emailService: EmailService,
    private smsService: SmsService,
    private whatsAppService: WhatsAppService,
  ) {}

  async sendNotification(notificationDto: SendNotificationDto): Promise<boolean> {
    try {
      switch (notificationDto.channel) {
        case NotificationChannel.EMAIL:
          return await this.emailService.sendEmail({
            to: notificationDto.recipient,
            subject: notificationDto.subject,
            html: notificationDto.message,
            templateData: notificationDto.templateData,
          });

        case NotificationChannel.SMS:
          return await this.smsService.sendSms({
            to: notificationDto.recipient,
            message: notificationDto.message,
          });

        case NotificationChannel.WHATSAPP:
          return await this.whatsAppService.sendWhatsAppMessage({
            to: notificationDto.recipient,
            message: notificationDto.message,
          });

        default:
          this.logger.error(`Unsupported notification channel: ${notificationDto.channel}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      return false;
    }
  }

  async sendOrderStatusNotification(notificationDto: OrderStatusNotificationDto): Promise<{
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  }> {
    const results = {
      email: false,
      sms: false,
      whatsapp: false,
    };

    // Send email notification
    if (notificationDto.customerEmail) {
      try {
        results.email = await this.emailService.sendOrderStatusEmail(
          notificationDto.customerEmail,
          notificationDto.orderNumber,
          notificationDto.newStatus,
          notificationDto.trackingNumber,
        );
      } catch (error) {
        this.logger.error('Failed to send order status email:', error);
      }
    }

    // Send SMS notification
    if (notificationDto.customerPhone) {
      try {
        results.sms = await this.smsService.sendOrderStatusSms(
          notificationDto.customerPhone,
          notificationDto.orderNumber,
          notificationDto.newStatus,
          notificationDto.trackingNumber,
        );
      } catch (error) {
        this.logger.error('Failed to send order status SMS:', error);
      }
    }

    // Send WhatsApp notification
    if (notificationDto.customerPhone) {
      try {
        results.whatsapp = await this.whatsAppService.sendOrderStatusWhatsApp(
          notificationDto.customerPhone,
          notificationDto.orderNumber,
          notificationDto.newStatus,
          undefined, // customer name - could be added to DTO
          notificationDto.trackingNumber,
        );
      } catch (error) {
        this.logger.error('Failed to send order status WhatsApp:', error);
      }
    }

    this.logger.log(`Order status notifications sent for order ${notificationDto.orderNumber}:`, results);
    return results;
  }

  async sendOrderConfirmationNotification(
    orderNumber: string,
    customerEmail: string,
    customerPhone: string,
    totalAmount: number,
    orderDetails: any,
  ): Promise<{
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  }> {
    const results = {
      email: false,
      sms: false,
      whatsapp: false,
    };

    // Send email confirmation
    if (customerEmail) {
      try {
        results.email = await this.emailService.sendOrderConfirmationEmail(
          customerEmail,
          orderNumber,
          { ...orderDetails, totalAmount },
        );
      } catch (error) {
        this.logger.error('Failed to send order confirmation email:', error);
      }
    }

    // Send SMS confirmation
    if (customerPhone) {
      try {
        results.sms = await this.smsService.sendOrderConfirmationSms(
          customerPhone,
          orderNumber,
          totalAmount,
        );
      } catch (error) {
        this.logger.error('Failed to send order confirmation SMS:', error);
      }
    }

    // Send WhatsApp confirmation
    if (customerPhone) {
      try {
        results.whatsapp = await this.whatsAppService.sendOrderConfirmationWhatsApp(
          customerPhone,
          orderNumber,
          totalAmount,
        );
      } catch (error) {
        this.logger.error('Failed to send order confirmation WhatsApp:', error);
      }
    }

    this.logger.log(`Order confirmation notifications sent for order ${orderNumber}:`, results);
    return results;
  }

  async handleSupportContact(supportContactDto: SupportContactDto): Promise<boolean> {
    try {
      // Log support contact for internal tracking
      this.logger.log('Support contact received:', {
        customer: supportContactDto.customerName,
        contact: supportContactDto.customerContact,
        orderId: supportContactDto.orderId,
        message: supportContactDto.message,
      });

      // Send acknowledgment to customer via preferred channel
      if (supportContactDto.preferredChannel === NotificationChannel.WHATSAPP) {
        return await this.whatsAppService.sendSupportMessage(
          supportContactDto.customerContact,
          'Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.',
          supportContactDto.orderId,
        );
      } else if (supportContactDto.preferredChannel === NotificationChannel.EMAIL) {
        return await this.emailService.sendEmail({
          to: supportContactDto.customerContact,
          subject: 'Support - Message reçu',
          html: `
            <p>Bonjour ${supportContactDto.customerName},</p>
            <p>Nous avons bien reçu votre message et notre équipe vous répondra dans les plus brefs délais.</p>
            ${supportContactDto.orderId ? `<p>Référence commande: ${supportContactDto.orderId}</p>` : ''}
            <p>Cordialement,<br>L'équipe support</p>
          `,
        });
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to handle support contact:', error);
      return false;
    }
  }

  getWhatsAppSupportLink(orderId?: string): string {
    return this.whatsAppService.getSupportWhatsAppLink(orderId);
  }

  generateWhatsAppLink(phoneNumber: string, message?: string): string {
    return this.whatsAppService.generateWhatsAppLink(phoneNumber, message);
  }
}