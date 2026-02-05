import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { ValidationService } from './validation.service';
import { ValidationFiltersDto } from './dto/validation-filters.dto';
import { ApprovalDto, RejectionDto, BulkApprovalDto, BulkRejectionDto } from './dto/validation-actions.dto';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

@Controller('admin/validations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Get()
  async getPendingValidations(@Query() filters: ValidationFiltersDto) {
    return this.validationService.getPendingValidations(filters);
  }

  @Get('stats')
  async getValidationStats() {
    return this.validationService.getValidationStats();
  }

  @Get('feedback/categories')
  async getFeedbackCategories() {
    return this.validationService.getFeedbackCategories();
  }

  @Get(':id')
  async getValidationById(@Param('id') id: string) {
    return this.validationService.getValidationById(id);
  }

  @Post(':id/approve')
  @Audit({
    action: AuditAction.APPROVE,
    resource: AuditResource.SUPPLIER_SUBMISSION,
    severity: AuditSeverity.MEDIUM,
    description: 'Approve validation item',
    resourceIdParam: 'id',
  })
  async approveValidation(
    @Param('id') id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() admin: any,
  ) {
    await this.validationService.approveProduct(
      id,
      approvalDto.edits,
      admin.id,
      approvalDto.notes,
    );
    return { success: true, message: 'Validation approved successfully' };
  }

  @Post(':id/reject')
  @Audit({
    action: AuditAction.REJECT,
    resource: AuditResource.SUPPLIER_SUBMISSION,
    severity: AuditSeverity.MEDIUM,
    description: 'Reject validation item',
    resourceIdParam: 'id',
  })
  async rejectValidation(
    @Param('id') id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() admin: any,
  ) {
    await this.validationService.rejectProduct(
      id,
      rejectionDto.feedback,
      admin.id,
      rejectionDto.notes,
    );
    return { success: true, message: 'Validation rejected successfully' };
  }

  @Post('bulk/approve')
  @Audit({
    action: AuditAction.BULK_APPROVE,
    resource: AuditResource.SUPPLIER_SUBMISSION,
    severity: AuditSeverity.HIGH,
    description: 'Bulk approve validation items',
  })
  async bulkApprove(
    @Body() bulkApprovalDto: BulkApprovalDto,
    @CurrentUser() admin: any,
  ) {
    const result = await this.validationService.bulkApprove(
      bulkApprovalDto.validationIds,
      bulkApprovalDto.globalEdits,
      admin.id,
      bulkApprovalDto.notes,
    );
    return result;
  }

  @Post('bulk/reject')
  @Audit({
    action: AuditAction.BULK_REJECT,
    resource: AuditResource.SUPPLIER_SUBMISSION,
    severity: AuditSeverity.HIGH,
    description: 'Bulk reject validation items',
  })
  async bulkReject(
    @Body() bulkRejectionDto: BulkRejectionDto,
    @CurrentUser() admin: any,
  ) {
    const result = await this.validationService.bulkReject(
      bulkRejectionDto.validationIds,
      bulkRejectionDto.feedback,
      admin.id,
      bulkRejectionDto.notes,
    );
    return result;
  }
}