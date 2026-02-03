import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { OrderStatus } from '../entities/order.entity';
import { UpdateStockDto } from '../inventory/dto/update-stock.dto';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard endpoints
  @Get('dashboard/stats')
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/orders-by-country')
  async getOrdersByCountry() {
    return this.adminService.getOrdersByCountry();
  }

  @Get('dashboard/revenue')
  async getRevenueReport(@Query() query: { startDate: string; endDate: string }): Promise<RevenueReportDto> {
    return this.adminService.getRevenueReport(query.startDate, query.endDate);
  }

  @Get('analytics/payment-methods')
  async getPaymentMethodStatistics(@Query() query: { startDate?: string; endDate?: string }) {
    return this.adminService.getPaymentMethodStatistics(query.startDate, query.endDate);
  }

  @Get('analytics/inventory-turnover')
  async getInventoryTurnoverReport(@Query() query: { startDate?: string; endDate?: string }) {
    return this.adminService.getInventoryTurnoverReport(query.startDate, query.endDate);
  }

  @Get('analytics/stock-levels')
  async getStockLevelReport() {
    return this.adminService.getStockLevelReport();
  }

  // User management endpoints
  @Get('users')
  async getUsers(@Query() filters: UserFiltersDto) {
    return this.adminService.getUsers(filters);
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  @Roles(UserRole.ADMIN) // Only admins can change roles
  @Audit({
    action: AuditAction.ROLE_CHANGE,
    resource: AuditResource.USER,
    severity: AuditSeverity.HIGH,
    description: 'Update user role',
    resourceIdParam: 'id',
  })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserRole(id, updateUserRoleDto.role, user.id);
  }

  @Delete('users/:id')
  @Roles(UserRole.ADMIN) // Only admins can delete users
  @Audit({
    action: AuditAction.DELETE,
    resource: AuditResource.USER,
    severity: AuditSeverity.HIGH,
    description: 'Delete user account',
    resourceIdParam: 'id',
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.deleteUser(id, user.id);
  }

  // Order management endpoints
  @Get('orders')
  async getAllOrders(@Query() query: { status?: OrderStatus; page?: number; limit?: number }) {
    return this.adminService.getAllOrders(query);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getOrderById(id);
  }

  @Patch('orders/:id/status')
  @Audit({
    action: AuditAction.ORDER_STATUS_CHANGE,
    resource: AuditResource.ORDER,
    severity: AuditSeverity.MEDIUM,
    description: 'Update order status',
    resourceIdParam: 'id',
  })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: OrderStatus; trackingNumber?: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateOrderStatus(id, body.status, body.trackingNumber, user.id);
  }

  // Inventory management endpoints
  @Get('inventory')
  async getAllInventory() {
    return this.adminService.getAllInventory();
  }

  @Get('inventory/low-stock')
  async getLowStockItems(@Query('threshold') threshold?: number) {
    return this.adminService.getLowStockItems(threshold);
  }

  @Patch('inventory/:productId/stock')
  @Audit({
    action: AuditAction.STOCK_ADJUSTMENT,
    resource: AuditResource.INVENTORY,
    severity: AuditSeverity.MEDIUM,
    description: 'Update product stock',
    resourceIdParam: 'productId',
  })
  async updateStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateStockDto: UpdateStockDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateStock(productId, updateStockDto, user.id);
  }

  @Post('inventory/:productId/adjust')
  @Audit({
    action: AuditAction.STOCK_ADJUSTMENT,
    resource: AuditResource.INVENTORY,
    severity: AuditSeverity.MEDIUM,
    description: 'Adjust product stock',
    resourceIdParam: 'productId',
  })
  async adjustStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: { adjustment: number; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.adjustStock(productId, body.adjustment, body.reason, user.id);
  }

  // Supplier management endpoints
  @Get('suppliers')
  async getSuppliers() {
    return this.adminService.getSuppliers();
  }

  @Get('suppliers/:id/products')
  async getSupplierProducts(@Param('id') supplierId: string) {
    return this.adminService.getSupplierProducts(supplierId);
  }
}