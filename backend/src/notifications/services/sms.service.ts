import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(options: SmsOptions): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with an SMS service
      // like Twilio, AWS SNS, or local West African SMS providers
      this.logger.log(`Sending SMS to ${options.to}`);
      
      // Mock SMS sending - replace with actual SMS service integration
      const smsConfig = {
        apiKey: this.configService.get('SMS_API_KEY'),
        senderId: this.configService.get('SMS_SENDER_ID', 'ECOMMERCE'),
      };

      // Simulate SMS sending
      await this.simulateSmsSending(options);
      
      this.logger.log(`SMS sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}:`, error);
      return false;
    }
  }

  async sendOrderStatusSms(
    phoneNumber: string,
    orderNumber: string,
    newStatus: string,
    trackingNumber?: string
  ): Promise<boolean> {
    const statusMessages = {
      pending: 'reçue et en cours de traitement',
      paid: 'Paiement confirmé! Préparation en cours',
      shipped: 'expédiée',
      delivered: 'livrée avec succès',
      cancelled: 'annulée',
    };

    const statusText = statusMessages[newStatus.toLowerCase()] || newStatus;
    let message = `Commande ${orderNumber}: ${statusText}.`;
    
    if (trackingNumber) {
      message += ` Suivi: ${trackingNumber}`;
    }
    
    message += ' Support WhatsApp: +223 XX XX XX XX';

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  async sendOrderConfirmationSms(
    phoneNumber: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<boolean> {
    const message = `Commande confirmée! N°${orderNumber}, Total: ${totalAmount} FCFA. Support: +223 XX XX XX XX`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  private async simulateSmsSending(options: SmsOptions): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Log the SMS content for development
    this.logger.debug('SMS Content:', {
      to: options.to,
      message: options.message,
    });
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Format phone number for West African countries
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 8) {
      // Assume Mali number, add +223
      return `+223${cleaned}`;
    } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      return `+223${cleaned.substring(1)}`;
    }
    
    return phoneNumber;
  }
}