import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with an email service
      // like SendGrid, AWS SES, or similar
      this.logger.log(`Sending email to ${options.to} with subject: ${options.subject}`);
      
      // Mock email sending - replace with actual email service integration
      const emailConfig = {
        apiKey: this.configService.get('EMAIL_API_KEY'),
        fromEmail: this.configService.get('EMAIL_FROM_ADDRESS', 'noreply@ecommerce.com'),
      };

      // Simulate email sending
      await this.simulateEmailSending(options);
      
      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendOrderStatusEmail(
    email: string,
    orderNumber: string,
    newStatus: string,
    trackingNumber?: string
  ): Promise<boolean> {
    const subject = `Order ${orderNumber} - Status Update`;
    const html = this.generateOrderStatusEmailTemplate(orderNumber, newStatus, trackingNumber);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderNumber: string,
    orderDetails: any
  ): Promise<boolean> {
    const subject = `Order Confirmation - ${orderNumber}`;
    const html = this.generateOrderConfirmationTemplate(orderNumber, orderDetails);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private async simulateEmailSending(options: EmailOptions): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log the email content for development
    this.logger.debug('Email Content:', {
      to: options.to,
      subject: options.subject,
      content: options.html || options.text,
    });
  }

  private generateOrderStatusEmailTemplate(
    orderNumber: string,
    status: string,
    trackingNumber?: string
  ): string {
    const statusMessages = {
      pending: 'Your order has been received and is being processed.',
      paid: 'Payment confirmed! Your order is being prepared for shipment.',
      shipped: 'Your order has been shipped and is on its way to you.',
      delivered: 'Your order has been delivered successfully.',
      cancelled: 'Your order has been cancelled.',
    };

    const message = statusMessages[status.toLowerCase()] || `Your order status has been updated to: ${status}`;
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Order Status Update</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Order #${orderNumber}</h2>
            <p style="font-size: 16px; color: #555;">${message}</p>
            ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
            <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
              <h3>Need Help?</h3>
              <p>Contact our support team:</p>
              <p>📞 WhatsApp: +223 XX XX XX XX</p>
              <p>📧 Email: support@ecommerce.com</p>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>Thank you for shopping with us!</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateOrderConfirmationTemplate(orderNumber: string, orderDetails: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; padding: 20px; text-align: center;">
            <h1 style="color: white;">Order Confirmed!</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Thank you for your order!</h2>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Total Amount:</strong> ${orderDetails.totalAmount} FCFA</p>
            <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
              <h3>Need Help?</h3>
              <p>Contact our support team:</p>
              <p>📞 WhatsApp: +223 XX XX XX XX</p>
              <p>📧 Email: support@ecommerce.com</p>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>We'll keep you updated on your order status.</p>
          </div>
        </body>
      </html>
    `;
  }
}