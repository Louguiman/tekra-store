import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { 
  SendNotificationDto, 
  OrderStatusNotificationDto, 
  SupportContactDto 
} from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    const result = await this.notificationsService.sendNotification(sendNotificationDto);
    return {
      success: result,
      message: result ? 'Notification sent successfully' : 'Failed to send notification',
    };
  }

  @Post('order-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async sendOrderStatusNotification(@Body() orderStatusDto: OrderStatusNotificationDto) {
    const results = await this.notificationsService.sendOrderStatusNotification(orderStatusDto);
    return {
      success: Object.values(results).some(result => result),
      results,
      message: 'Order status notifications processed',
    };
  }

  @Post('support-contact')
  @Public()
  async handleSupportContact(@Body() supportContactDto: SupportContactDto) {
    const result = await this.notificationsService.handleSupportContact(supportContactDto);
    return {
      success: result,
      message: result ? 'Support contact received' : 'Failed to process support contact',
    };
  }

  @Get('whatsapp-link')
  @Public()
  getWhatsAppSupportLink(@Query('orderId') orderId?: string) {
    const link = this.notificationsService.getWhatsAppSupportLink(orderId);
    return {
      whatsappLink: link,
      message: 'WhatsApp support link generated',
    };
  }

  @Get('whatsapp-custom-link')
  @Public()
  generateCustomWhatsAppLink(
    @Query('phoneNumber') phoneNumber: string,
    @Query('message') message?: string,
  ) {
    if (!phoneNumber) {
      return {
        error: 'Phone number is required',
      };
    }

    const link = this.notificationsService.generateWhatsAppLink(phoneNumber, message);
    return {
      whatsappLink: link,
      message: 'Custom WhatsApp link generated',
    };
  }
}