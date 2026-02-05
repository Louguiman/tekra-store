import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuppliersService, CreateSupplierDto, UpdateSupplierDto } from './suppliers.service';
import { TemplateService } from './template.service';
import { TemplateNotificationService } from './template-notification.service';
import { TemplateImprovementService } from './template-improvement.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
  TemplateValidationDto,
  TemplateUsageDto,
  TemplateRecommendationDto,
} from './dto/template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly templateService: TemplateService,
    private readonly templateNotificationService: TemplateNotificationService,
    private readonly templateImprovementService: TemplateImprovementService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(@Query('country') countryCode?: string) {
    if (countryCode) {
      return this.suppliersService.getSuppliersByCountry(countryCode);
    }
    return this.suppliersService.findAll();
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findActive() {
    return this.suppliersService.getActiveSuppliers();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/activity')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getActivity(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.suppliersService.getSupplierActivity(id, limit);
  }

  @Get(':id/performance')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getPerformanceReport(@Param('id') id: string) {
    return this.suppliersService.getPerformanceReport(id);
  }

  @Post(':id/recalculate-metrics')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  recalculateMetrics(@Param('id') id: string) {
    return this.suppliersService.recalculateMetrics(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.suppliersService.deactivateSupplier(id, reason);
  }

  @Post(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id') id: string) {
    return this.suppliersService.reactivateSupplier(id);
  }

  @Get(':id/privileges')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getPrivileges(@Param('id') id: string) {
    return this.suppliersService.findOne(id).then(supplier => 
      this.suppliersService.getSupplierPrivileges(supplier)
    );
  }

  @Get(':id/expedited-processing')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  checkExpeditedProcessing(@Param('id') id: string) {
    return this.suppliersService.qualifiesForExpeditedProcessing(id);
  }

  @Get(':id/auto-approval')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  checkAutoApproval(
    @Param('id') id: string,
    @Query('confidenceScore') confidenceScore: number,
  ) {
    return this.suppliersService.qualifiesForAutoApproval(id, confidenceScore);
  }

  @Get(':id/priority')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getPriority(@Param('id') id: string) {
    return this.suppliersService.getSupplierPriority(id);
  }

  @Get(':id/submission-limit')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  checkSubmissionLimit(@Param('id') id: string) {
    return this.suppliersService.checkDailySubmissionLimit(id);
  }

  @Post(':id/upgrade-tier')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  upgradeTier(
    @Param('id') id: string,
    @Body('tier') tier: 'gold' | 'silver' | 'bronze',
    @Body('reason') reason: string,
  ) {
    return this.suppliersService.upgradeSupplierTier(id, tier, reason);
  }

  @Get('by-tier/:tier')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getByTier(@Param('tier') tier: 'gold' | 'silver' | 'bronze' | 'new') {
    return this.suppliersService.getSuppliersByTier(tier);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  // ==================== Template Management Endpoints ====================

  @Post('templates')
  @Roles(UserRole.ADMIN)
  createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAllTemplates(@Query() filters: TemplateFiltersDto) {
    return this.templateService.findAll(filters);
  }

  @Get('templates/:templateId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOneTemplate(@Param('templateId') templateId: string) {
    return this.templateService.findOne(templateId);
  }

  @Patch('templates/:templateId')
  @Roles(UserRole.ADMIN)
  updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.update(templateId, updateTemplateDto);
  }

  @Delete('templates/:templateId')
  @Roles(UserRole.ADMIN)
  removeTemplate(@Param('templateId') templateId: string) {
    return this.templateService.remove(templateId);
  }

  @Post('templates/:templateId/validate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  validateTemplate(@Body() validationDto: TemplateValidationDto) {
    return this.templateService.validateSubmission(validationDto);
  }

  @Post('templates/:templateId/usage')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  recordTemplateUsage(@Body() usageDto: TemplateUsageDto) {
    return this.templateService.recordUsage(usageDto);
  }

  @Get('templates/:templateId/analytics')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getTemplateAnalytics(@Param('templateId') templateId: string) {
    return this.templateService.getAnalytics(templateId);
  }

  @Post('templates/:templateId/clone')
  @Roles(UserRole.ADMIN)
  cloneTemplate(
    @Param('templateId') templateId: string,
    @Body('supplierId') supplierId: string,
    @Body('customizations') customizations?: Partial<CreateTemplateDto>,
  ) {
    return this.templateService.cloneTemplate(templateId, supplierId, customizations);
  }

  @Post('templates/recommendations')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  getTemplateRecommendations(@Body() recommendationDto: TemplateRecommendationDto) {
    return this.templateService.getRecommendations(recommendationDto);
  }

  @Get(':id/templates')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getSupplierTemplates(@Param('id') id: string) {
    return this.templateService.getSupplierTemplates(id);
  }

  @Post('templates/:templateId/feedback')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  provideTemplateFeedback(
    @Param('templateId') templateId: string,
    @Body('supplierId') supplierId: string,
    @Body('feedback') feedback: string,
  ) {
    return this.templateService.provideFeedback(templateId, supplierId, feedback);
  }

  // ==================== Template Improvement Endpoints ====================

  @Get('templates/:templateId/analysis')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  analyzeTemplate(@Param('templateId') templateId: string) {
    return this.templateImprovementService.analyzeTemplate(templateId);
  }

  @Get('templates/analysis/all')
  @Roles(UserRole.ADMIN)
  analyzeAllTemplates() {
    return this.templateImprovementService.analyzeAllTemplates();
  }

  @Post('templates/:templateId/improvements/apply')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  applyImprovement(
    @Param('templateId') templateId: string,
    @Body() improvement: any,
  ) {
    return this.templateImprovementService.applyImprovement(templateId, improvement);
  }

  // ==================== Template Notification Endpoints ====================

  @Post('templates/:templateId/notify-update')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  notifyTemplateUpdate(
    @Param('templateId') templateId: string,
    @Body('oldVersion') oldVersion: number,
    @Body('newVersion') newVersion: number,
    @Body('changes') changes: string[],
  ) {
    return this.templateNotificationService.notifyTemplateUpdate(
      templateId,
      oldVersion,
      newVersion,
      changes,
    );
  }

  @Post(':id/template-recommendation')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  sendTemplateRecommendation(
    @Param('id') supplierId: string,
    @Body('templateId') templateId: string,
    @Body('reason') reason: string,
  ) {
    return this.templateNotificationService.sendTemplateRecommendation(
      supplierId,
      templateId,
      reason,
    );
  }

  @Post(':id/validation-feedback')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  sendValidationFeedback(
    @Param('id') supplierId: string,
    @Body('templateId') templateId: string,
    @Body('feedback') feedback: string,
    @Body('suggestions') suggestions: string[],
  ) {
    return this.templateNotificationService.sendValidationFeedback(
      supplierId,
      templateId,
      feedback,
      suggestions,
    );
  }
}