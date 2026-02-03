import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Get,
  UseGuards,
  HttpStatus,
  HttpException,
  Param,
  Query,
} from '@nestjs/common';
import { WhatsappService, WhatsAppWebhookPayload } from './whatsapp.service';
import { RateLimiterService } from './rate-limiter.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const startTime = Date.now();

    try {
      // Extract client IP for rate limiting
      const clientIp = realIp || forwardedFor?.split(',')[0] || 'unknown';
      
      // Apply rate limiting (Requirement 5.3)
      if (this.rateLimiterService.isRateLimited(clientIp)) {
        const resetTime = this.rateLimiterService.getResetTime(clientIp);
        throw new HttpException(
          {
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Validate webhook signature for security (Requirement 8.5)
      const rawPayload = JSON.stringify(payload);
      if (!this.whatsappService.validateWebhookSignature(signature, rawPayload)) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Validate payload structure (Requirement 1.1)
      if (!payload.object || payload.object !== 'whatsapp_business_account') {
        throw new BadRequestException('Invalid webhook payload');
      }

      // Validate user agent for additional security
      if (userAgent && !userAgent.includes('WhatsApp')) {
        throw new UnauthorizedException('Invalid user agent');
      }

      // Process the incoming message with timeout handling
      const result = await Promise.race([
        this.whatsappService.processIncomingMessage(payload),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout')), 30000)
        )
      ]);
      
      if (!result.processed) {
        throw new BadRequestException(result.error || 'Failed to process message');
      }

      return {
        success: true,
        submissionId: result.submissionId,
        processingTime: result.processingTime,
        totalTime: Date.now() - startTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log error for monitoring
      console.error('Webhook processing error:', {
        error: error.message,
        processingTime,
        payload: payload.object,
        signature: signature ? 'present' : 'missing',
      });

      throw error;
    }
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

  @Get('media/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getMediaFile(@Param('submissionId') submissionId: string) {
    const mediaFile = await this.whatsappService.getMediaFile(submissionId);
    
    if (!mediaFile) {
      throw new BadRequestException('Media file not found');
    }

    return {
      id: mediaFile.id,
      originalName: mediaFile.originalName,
      mimeType: mediaFile.mimeType,
      size: mediaFile.size,
      downloadedAt: mediaFile.downloadedAt,
      // Note: In production, you'd want to serve the actual file content
      // or provide a secure download URL
    };
  }

  @Get('groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getMessageGroups(@Query('supplierId') supplierId?: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.whatsappService.getMessageGroups(supplierId, limitNum);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getSubmissionStats(@Query('supplierId') supplierId?: string) {
    return this.whatsappService.getSubmissionStats(supplierId);
  }
}