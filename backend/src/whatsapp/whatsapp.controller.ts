import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Get,
  UseGuards,
} from '@nestjs/common';
import { WhatsappService, WhatsAppWebhookPayload } from './whatsapp.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    // Validate webhook signature
    const rawPayload = JSON.stringify(payload);
    if (!this.whatsappService.validateWebhookSignature(signature, rawPayload)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Validate payload structure
    if (!payload.object || payload.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Process the incoming message
    const result = await this.whatsappService.processIncomingMessage(payload);
    
    if (!result.processed) {
      throw new BadRequestException(result.error || 'Failed to process message');
    }

    return {
      success: true,
      submissionId: result.submissionId,
      processingTime: result.processingTime,
    };
  }

  @Get('webhook')
  @Public()
  verifyWebhook(@Headers('hub.challenge') challenge: string) {
    // WhatsApp webhook verification
    return challenge;
  }

  @Get('submissions/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getPendingSubmissions() {
    return this.whatsappService.getPendingSubmissions();
  }
}