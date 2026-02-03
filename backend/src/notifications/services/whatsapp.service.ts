import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppOptions {
  to: string;
  message: string;
  templateName?: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private configService: ConfigService) {}

  async sendWhatsAppMessage(options: WhatsAppOptions): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with WhatsApp Business API
      // or services like Twilio WhatsApp API
      this.logger.log(`Sending WhatsApp message to ${options.to}`);
      
      // Mock WhatsApp sending - replace with actual WhatsApp API integration
      const whatsappConfig = {
        apiKey: this.configService.get('WHATSAPP_API_KEY'),
        phoneNumberId: this.configService.get('WHATSAPP_PHONE_NUMBER_ID'),
        accessToken: this.configService.get('WHATSAPP_ACCESS_TOKEN'),
      };

      // Simulate WhatsApp message sending
      await this.simulateWhatsAppSending(options);
      
      this.logger.log(`WhatsApp message sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${options.to}:`, error);
      return false;
    }
  }

  async sendOrderStatusWhatsApp(
    phoneNumber: string,
    orderNumber: string,
    newStatus: string,
    customerName?: string,
    trackingNumber?: string
  ): Promise<boolean> {
    const greeting = customerName ? `Bonjour ${customerName}` : 'Bonjour';
    
    const statusMessages = {
      pending: 'Votre commande a été reçue et est en cours de traitement.',
      paid: 'Paiement confirmé! Votre commande est en préparation.',
      shipped: 'Votre commande a été expédiée.',
      delivered: 'Votre commande a été livrée avec succès.',
      cancelled: 'Votre commande a été annulée.',
    };

    const statusText = statusMessages[newStatus.toLowerCase()] || `Le statut de votre commande a été mis à jour: ${newStatus}`;
    
    let message = `${greeting},\n\n📦 Commande #${orderNumber}\n${statusText}`;
    
    if (trackingNumber) {
      message += `\n\n📍 Numéro de suivi: ${trackingNumber}`;
    }
    
    message += '\n\n💬 Besoin d\'aide? Répondez à ce message ou appelez-nous.';

    return this.sendWhatsAppMessage({
      to: phoneNumber,
      message,
    });
  }

  async sendOrderConfirmationWhatsApp(
    phoneNumber: string,
    orderNumber: string,
    totalAmount: number,
    customerName?: string
  ): Promise<boolean> {
    const greeting = customerName ? `Bonjour ${customerName}` : 'Bonjour';
    
    const message = `${greeting},\n\n✅ Commande confirmée!\n\n📦 Numéro: ${orderNumber}\n💰 Total: ${totalAmount} FCFA\n\nNous vous tiendrons informé du statut de votre commande.\n\n💬 Questions? Répondez à ce message!`;

    return this.sendWhatsAppMessage({
      to: phoneNumber,
      message,
    });
  }

  async sendSupportMessage(
    phoneNumber: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    let supportMessage = `📞 Support Client\n\n${message}`;
    
    if (orderId) {
      supportMessage += `\n\n📦 Commande: ${orderId}`;
    }
    
    supportMessage += '\n\nNous vous répondrons dans les plus brefs délais.';

    return this.sendWhatsAppMessage({
      to: phoneNumber,
      message: supportMessage,
    });
  }

  generateWhatsAppLink(phoneNumber: string, message?: string): string {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = message ? encodeURIComponent(message) : '';
    
    return `https://wa.me/${formattedNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
  }

  getSupportWhatsAppLink(orderId?: string): string {
    const supportNumber = this.configService.get('WHATSAPP_SUPPORT_NUMBER', '+22312345678');
    let message = 'Bonjour, j\'ai besoin d\'aide concernant';
    
    if (orderId) {
      message += ` ma commande ${orderId}`;
    } else {
      message += ' votre service';
    }
    
    return this.generateWhatsAppLink(supportNumber, message);
  }

  private async simulateWhatsAppSending(options: WhatsAppOptions): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Log the WhatsApp message content for development
    this.logger.debug('WhatsApp Message Content:', {
      to: options.to,
      message: options.message,
      template: options.templateName,
    });
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Format phone number for WhatsApp (remove + and spaces)
    return phoneNumber.replace(/[\s+]/g, '');
  }
}