import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    WhatsAppService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}