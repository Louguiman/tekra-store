import { IsString, IsEmail, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum NotificationType {
  ORDER_STATUS_CHANGE = 'order_status_change',
  ORDER_CONFIRMATION = 'order_confirmation',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  DELIVERY_UPDATE = 'delivery_update',
  SUPPORT_MESSAGE = 'support_message',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export class SendNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  recipient: string; // email, phone number, or WhatsApp number

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsString()
  orderId?: string;
}

export class OrderStatusNotificationDto {
  @IsString()
  orderId: string;

  @IsString()
  newStatus: string;

  @IsString()
  customerEmail: string;

  @IsString()
  customerPhone: string;

  @IsString()
  orderNumber: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class SupportContactDto {
  @IsString()
  customerName: string;

  @IsString()
  customerContact: string; // phone or email

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  preferredChannel?: NotificationChannel;
}