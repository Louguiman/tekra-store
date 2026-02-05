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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

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
}