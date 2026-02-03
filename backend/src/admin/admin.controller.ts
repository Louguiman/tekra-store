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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { OrderStatus } from '../entities/order.entity';
import { UpdateStockDto } from '../inventory/dto/update-stock.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, updateUserRoleDto.role);
  }

  @Delete('users/:id')
  @Roles(UserRole.ADMIN) // Only admins can delete users
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
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
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: OrderStatus; trackingNumber?: string },
  ) {
    return this.adminService.updateOrderStatus(id, body.status, body.trackingNumber);
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
  async updateStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.adminService.updateStock(productId, updateStockDto);
  }

  @Post('inventory/:productId/adjust')
  async adjustStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: { adjustment: number; reason?: string },
  ) {
    return this.adminService.adjustStock(productId, body.adjustment, body.reason);
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