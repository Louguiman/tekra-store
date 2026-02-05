import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { Payment } from '../entities/payment.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { UserFiltersDto } from './dto/user-filters.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from '../orders/orders.service';
import { UpdateStockDto } from '../inventory/dto/update-stock.dto';
import { AuditService } from '../audit/audit.service';
import { SecurityMonitorService } from '../audit/security-monitor.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { PipelineOrchestratorService } from '../whatsapp/pipeline-orchestrator.service';
import { ErrorRecoveryService } from '../whatsapp/error-recovery.service';
import { HealthMonitoringService } from '../whatsapp/health-monitoring.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(SupplierSubmission)
    private readonly submissionRepository: Repository<SupplierSubmission>,
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
    private readonly securityMonitor: SecurityMonitorService,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
    private readonly errorRecovery: ErrorRecoveryService,
    private readonly healthMonitoring: HealthMonitoringService,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalProducts,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      this.userRepository.count(),
      this.orderRepository.count(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne()
        .then(result => parseFloat(result.total) || 0),
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({ where: { status: OrderStatus.DELIVERED } }),
      this.productRepository.count(),
      this.inventoryRepository.count({ where: { quantity: 5 } }), // Low stock threshold
      this.orderRepository.find({
        relations: ['user', 'country'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalProducts,
      lowStockProducts,
      recentOrders,
    };
  }

  async getOrdersByCountry() {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.country', 'country')
      .select([
        'country.code as countryCode',
        'country.name as countryName',
        'COUNT(order.id) as orderCount',
        'SUM(order.totalAmount) as totalRevenue',
      ])
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .groupBy('country.code, country.name')
      .getRawMany();

    return result.map(row => ({
      countryCode: row.countryCode,
      countryName: row.countryName,
      orderCount: parseInt(row.orderCount),
      totalRevenue: parseFloat(row.totalRevenue) || 0,
    }));
  }

  async getRevenueReport(startDate: string, endDate: string): Promise<RevenueReportDto> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const orders = await this.orderRepository.find({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: Between(start, end),
      },
      relations: ['payments'],
      order: { createdAt: 'ASC' },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Group by day
    const revenueByDay = orders.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { revenue: 0, orderCount: 0 };
      }
      acc[date].revenue += order.totalAmount;
      acc[date].orderCount += 1;
      return acc;
    }, {} as Record<string, { revenue: number; orderCount: number }>);

    // Group by payment method from actual payment data
    const paymentMethodStats = orders.reduce((acc, order) => {
      if (order.payments && order.payments.length > 0) {
        const payment = order.payments[0]; // Get the successful payment
        const method = payment.method;
        if (!acc[method]) {
          acc[method] = { revenue: 0, orderCount: 0 };
        }
        acc[method].revenue += order.totalAmount;
        acc[method].orderCount += 1;
      }
      return acc;
    }, {} as Record<string, { revenue: number; orderCount: number }>);

    const revenueByPaymentMethod = Object.entries(paymentMethodStats).map(([method, data]) => ({
      paymentMethod: method,
      revenue: data.revenue,
      orderCount: data.orderCount,
    }));

    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
      revenueByDay: Object.entries(revenueByDay).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orderCount: data.orderCount,
      })),
      revenueByPaymentMethod,
    };
  }

  async getPaymentMethodStatistics(startDate?: string, endDate?: string) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.payments', 'payment')
      .select([
        'payment.method as paymentMethod',
        'COUNT(order.id) as orderCount',
        'SUM(order.totalAmount) as totalRevenue',
        'AVG(order.totalAmount) as averageOrderValue',
      ])
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('payment.status = :paymentStatus', { paymentStatus: 'completed' })
      .groupBy('payment.method');

    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const result = await queryBuilder.getRawMany();

    return result.map(row => ({
      paymentMethod: row.paymentMethod,
      orderCount: parseInt(row.orderCount),
      totalRevenue: parseFloat(row.totalRevenue) || 0,
      averageOrderValue: parseFloat(row.averageOrderValue) || 0,
    }));
  }

  async getInventoryTurnoverReport(startDate?: string, endDate?: string) {
    // Get inventory items with product information
    const inventoryItems = await this.inventoryRepository.find({
      relations: ['product', 'product.category'],
    });

    // Get order items for the specified period to calculate turnover
    const orderItemsQuery = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .leftJoin('item.product', 'product')
      .select([
        'product.id as productId',
        'product.name as productName',
        'SUM(item.quantity) as totalSold',
        'AVG(item.unitPrice) as averagePrice',
      ])
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .groupBy('product.id, product.name');

    if (startDate && endDate) {
      orderItemsQuery.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const salesData = await orderItemsQuery.getRawMany();

    // Calculate turnover metrics
    const turnoverReport = inventoryItems.map(item => {
      const sales = salesData.find(s => s.productId === item.product.id);
      const totalSold = sales ? parseInt(sales.totalSold) : 0;
      const averagePrice = sales ? parseFloat(sales.averagePrice) : 0;
      const currentStock = item.quantity;
      
      // Calculate turnover ratio (sold / average stock)
      const turnoverRatio = currentStock > 0 ? totalSold / currentStock : 0;
      
      // Calculate days of inventory (assuming 30-day period if no dates specified)
      const periodDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const daysOfInventory = totalSold > 0 ? (currentStock / totalSold) * periodDays : Infinity;

      return {
        productId: item.product.id,
        productName: item.product.name,
        category: item.product.category?.name || 'Uncategorized',
        currentStock: currentStock,
        totalSold,
        turnoverRatio: Math.round(turnoverRatio * 100) / 100,
        daysOfInventory: daysOfInventory === Infinity ? null : Math.round(daysOfInventory),
        averagePrice,
        revenue: totalSold * averagePrice,
        warehouseLocation: item.warehouseLocation,
        supplierId: item.supplierId,
      };
    });

    // Sort by turnover ratio (highest first)
    return turnoverReport.sort((a, b) => b.turnoverRatio - a.turnoverRatio);
  }

  async getStockLevelReport() {
    const inventoryItems = await this.inventoryRepository.find({
      relations: ['product', 'product.category'],
      order: { quantity: 'ASC' },
    });

    const totalProducts = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.lowStockThreshold);
    const outOfStockItems = inventoryItems.filter(item => item.quantity === 0);
    const wellStockedItems = inventoryItems.filter(item => item.quantity > item.lowStockThreshold * 2);

    const stockByCategory = inventoryItems.reduce((acc, item) => {
      const category = item.product.category?.name || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          totalItems: 0,
          totalStock: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
        };
      }
      acc[category].totalItems += 1;
      acc[category].totalStock += item.quantity;
      if (item.quantity <= item.lowStockThreshold) {
        acc[category].lowStockItems += 1;
      }
      if (item.quantity === 0) {
        acc[category].outOfStockItems += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      summary: {
        totalProducts,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        wellStockedCount: wellStockedItems.length,
        totalStockValue: inventoryItems.reduce((sum, item) => {
          const price = item.product.prices?.[0]?.price || 0;
          return sum + (item.quantity * price);
        }, 0),
      },
      stockByCategory: Object.entries(stockByCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
      lowStockItems: lowStockItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        currentStock: item.quantity,
        threshold: item.lowStockThreshold,
        warehouseLocation: item.warehouseLocation,
        supplierId: item.supplierId,
      })),
      outOfStockItems: outOfStockItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        warehouseLocation: item.warehouseLocation,
        supplierId: item.supplierId,
      })),
    };
  }

  async getUsers(filters: UserFiltersDto) {
    const {
      page = 1,
      limit = 20,
      role,
      countryCode,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (countryCode) {
      queryBuilder.andWhere('user.countryCode = :countryCode', { countryCode });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    // Remove password hashes
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

    return {
      users: sanitizedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password hash
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async updateUserRole(id: string, role: UserRole, adminUserId: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;

    // Security check for privilege escalation
    await this.securityMonitor.checkPrivilegeEscalation(adminUserId, id, role);

    user.role = role;
    const updatedUser = await this.userRepository.save(user);

    // Log the role change
    await this.auditService.logAction({
      userId: adminUserId,
      action: AuditAction.ROLE_CHANGE,
      resource: AuditResource.USER,
      resourceId: id,
      severity: AuditSeverity.HIGH,
      description: `Changed user role from ${oldRole} to ${role}`,
      metadata: {
        targetUserId: id,
        oldRole,
        newRole: role,
      },
      success: true,
    });

    // Remove password hash
    const { passwordHash, ...sanitizedUser } = updatedUser;
    return sanitizedUser;
  }

  async deleteUser(id: string, adminUserId: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has orders
    const orderCount = await this.orderRepository.count({ where: { user: { id } } });
    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete user with existing orders');
    }

    await this.userRepository.remove(user);

    // Log the user deletion
    await this.auditService.logAction({
      userId: adminUserId,
      action: AuditAction.DELETE,
      resource: AuditResource.USER,
      resourceId: id,
      severity: AuditSeverity.HIGH,
      description: `Deleted user account`,
      metadata: {
        deletedUserEmail: user.email,
        deletedUserPhone: user.phone,
        deletedUserRole: user.role,
      },
      success: true,
    });
  }

  // Order Management Methods
  async getAllOrders(query: { status?: OrderStatus; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.country', 'country')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.images', 'country', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus, trackingNumber?: string, adminUserId?: string) {
    const result = await this.ordersService.updateStatus(id, { status, trackingNumber });

    // Log the order status change
    if (adminUserId) {
      await this.auditService.logAction({
        userId: adminUserId,
        action: AuditAction.ORDER_STATUS_CHANGE,
        resource: AuditResource.ORDER,
        resourceId: id,
        severity: AuditSeverity.MEDIUM,
        description: `Updated order status to ${status}`,
        metadata: {
          newStatus: status,
          trackingNumber,
        },
        success: true,
      });
    }

    return result;
  }

  // Inventory Management Methods
  async getAllInventory() {
    return this.inventoryService.getAllInventoryItems();
  }

  async getLowStockItems(threshold?: number) {
    return this.inventoryService.getLowStockItems(threshold);
  }

  async updateStock(productId: string, updateStockDto: UpdateStockDto, adminUserId?: string) {
    const result = await this.inventoryService.updateStock(productId, updateStockDto);

    // Log the stock update
    if (adminUserId) {
      await this.auditService.logAction({
        userId: adminUserId,
        action: AuditAction.STOCK_ADJUSTMENT,
        resource: AuditResource.INVENTORY,
        resourceId: productId,
        severity: AuditSeverity.MEDIUM,
        description: `Updated stock quantity`,
        metadata: {
          newQuantity: updateStockDto.quantity,
          warehouseLocation: updateStockDto.warehouseLocation,
          supplierId: updateStockDto.supplierId,
        },
        success: true,
      });
    }

    return result;
  }

  async adjustStock(productId: string, adjustment: number, reason?: string, adminUserId?: string) {
    const result = await this.inventoryService.adjustStock(productId, adjustment, reason);

    // Log the stock adjustment
    if (adminUserId) {
      await this.auditService.logAction({
        userId: adminUserId,
        action: AuditAction.STOCK_ADJUSTMENT,
        resource: AuditResource.INVENTORY,
        resourceId: productId,
        severity: AuditSeverity.MEDIUM,
        description: `Adjusted stock by ${adjustment}`,
        metadata: {
          adjustment,
          reason,
        },
        success: true,
      });
    }

    return result;
  }

  // Supplier Management Methods
  async getSuppliers() {
    // Get unique suppliers from inventory items
    const suppliers = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select(['inventory.supplierId'])
      .addSelect('COUNT(inventory.id)', 'productCount')
      .where('inventory.supplierId IS NOT NULL')
      .groupBy('inventory.supplierId')
      .getRawMany();

    return suppliers.map(supplier => ({
      id: supplier.inventory_supplierId,
      productCount: parseInt(supplier.productCount),
    }));
  }

  async getSupplierProducts(supplierId: string) {
    return this.inventoryRepository.find({
      where: { supplierId },
      relations: ['product', 'product.images'],
      order: { updatedAt: 'DESC' },
    });
  }

  // WhatsApp Pipeline Management Methods

  async getWhatsAppPipelineStats() {
    return this.pipelineOrchestrator.getPipelineStats();
  }

  async getWhatsAppSubmissions(query: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    validationStatus?: 'pending' | 'approved' | 'rejected';
    supplierId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.supplier', 'supplier')
      .orderBy('submission.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('submission.processingStatus = :status', { status: query.status });
    }

    if (query.validationStatus) {
      queryBuilder.andWhere('submission.validationStatus = :validationStatus', { 
        validationStatus: query.validationStatus 
      });
    }

    if (query.supplierId) {
      queryBuilder.andWhere('supplier.id = :supplierId', { supplierId: query.supplierId });
    }

    const [submissions, total] = await queryBuilder.getManyAndCount();

    return {
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWhatsAppSubmissionById(id: string) {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: ['supplier', 'processingLogs'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    return submission;
  }

  async triggerWhatsAppProcessing(submissionId: string, adminId: string) {
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: submissionId,
      severity: AuditSeverity.MEDIUM,
      description: 'Admin manually triggered pipeline processing',
      success: true,
    });

    await this.pipelineOrchestrator.triggerPipelineProcessing(submissionId);

    return {
      success: true,
      message: 'Pipeline processing triggered successfully',
    };
  }

  async reprocessWhatsAppSubmission(submissionId: string, adminId: string) {
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: submissionId,
      severity: AuditSeverity.HIGH,
      description: 'Admin triggered reprocessing of failed submission',
      success: true,
    });

    await this.pipelineOrchestrator.reprocessFailedSubmission(submissionId);

    return {
      success: true,
      message: 'Submission reprocessing triggered successfully',
    };
  }

  async getWhatsAppHealth() {
    return this.healthMonitoring.performHealthCheck();
  }

  async getWhatsAppErrors() {
    return this.healthMonitoring.getUnresolvedErrors();
  }

  async resolveWhatsAppError(errorId: string, adminId: string) {
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.SYSTEM_CONFIG,
      resource: AuditResource.SYSTEM,
      resourceId: errorId,
      severity: AuditSeverity.MEDIUM,
      description: 'Admin resolved WhatsApp error',
      success: true,
    });

    await this.healthMonitoring.resolveCriticalError(errorId);

    return {
      success: true,
      message: 'Error resolved successfully',
    };
  }

  async getWhatsAppRecoveryQueue() {
    return this.errorRecovery.getFailedOperations();
  }

  async getWhatsAppRecoveryStats() {
    return this.errorRecovery.getQueueStatistics();
  }

  async retryWhatsAppSubmission(submissionId: string, adminId: string) {
    await this.auditService.logAction({
      userId: adminId,
      action: AuditAction.SUPPLIER_SUBMISSION,
      resource: AuditResource.SUPPLIER_SUBMISSION,
      resourceId: submissionId,
      severity: AuditSeverity.MEDIUM,
      description: 'Admin triggered retry of failed submission',
      success: true,
    });

    const result = await this.errorRecovery.retryFailedSubmission(submissionId);

    if (!result.success) {
      throw new BadRequestException(`Retry failed: ${result.error?.message}`);
    }

    return {
      success: true,
      attempts: result.attempts,
      totalTime: result.totalTime,
      message: 'Submission retry completed successfully',
    };
  }

  // Additional WhatsApp Dashboard Methods

  async getWhatsAppRecentActivity(limit: number = 10) {
    const submissions = await this.submissionRepository.find({
      relations: ['supplier'],
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    return submissions.map(submission => {
      // Calculate average confidence from extracted data
      const avgConfidence = submission.extractedData && submission.extractedData.length > 0
        ? submission.extractedData.reduce((sum, p) => sum + p.confidenceScore, 0) / submission.extractedData.length
        : 0;

      return {
        id: submission.id,
        timestamp: submission.updatedAt,
        type: submission.processingStatus === 'completed' ? 'success' : 
              submission.processingStatus === 'failed' ? 'error' : 'processing',
        supplierName: submission.supplier?.name || 'Unknown Supplier',
        supplierId: submission.supplier?.id,
        message: this.getActivityMessage(submission),
        processingStatus: submission.processingStatus,
        validationStatus: submission.validationStatus,
        confidence: avgConfidence,
      };
    });
  }

  private getActivityMessage(submission: SupplierSubmission): string {
    if (submission.processingStatus === 'completed' && submission.validationStatus === 'approved') {
      return `Product submission approved and added to inventory`;
    } else if (submission.processingStatus === 'completed' && submission.validationStatus === 'pending') {
      return `Product submission processed, awaiting validation`;
    } else if (submission.processingStatus === 'failed') {
      return `Product submission failed during processing`;
    } else if (submission.processingStatus === 'processing') {
      return `Product submission in progress`;
    } else if (submission.validationStatus === 'rejected') {
      return `Product submission rejected`;
    }
    return `Product submission received`;
  }

  async getWhatsAppTopSuppliers(limit: number = 5) {
    const result = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoin('submission.supplier', 'supplier')
      .select([
        'supplier.id as supplierId',
        'supplier.name as supplierName',
        'supplier.phone as supplierPhone',
        'COUNT(submission.id) as totalSubmissions',
        'SUM(CASE WHEN submission.validationStatus = \'approved\' THEN 1 ELSE 0 END) as approvedCount',
        'SUM(CASE WHEN submission.validationStatus = \'rejected\' THEN 1 ELSE 0 END) as rejectedCount',
        'MAX(submission.createdAt) as lastSubmission',
      ])
      .where('supplier.id IS NOT NULL')
      .groupBy('supplier.id, supplier.name, supplier.phone')
      .orderBy('totalSubmissions', 'DESC')
      .limit(limit)
      .getRawMany();

    // Get submissions with extracted data to calculate confidence
    const supplierIds = result.map(r => r.supplierId);
    const submissionsWithData = await this.submissionRepository.find({
      where: supplierIds.map(id => ({ supplier: { id } })),
      select: ['id', 'extractedData'],
    });

    return result.map(row => {
      const total = parseInt(row.totalSubmissions);
      const approved = parseInt(row.approvedCount);
      const rejected = parseInt(row.rejectedCount);
      const approvalRate = total > 0 ? (approved / total) * 100 : 0;

      // Calculate average confidence from extracted data
      const supplierSubmissions = submissionsWithData.filter(s => 
        result.find(r => r.supplierId === s.supplier?.id)
      );
      
      let avgConfidence = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;

      supplierSubmissions.forEach(sub => {
        if (sub.extractedData && sub.extractedData.length > 0) {
          sub.extractedData.forEach(product => {
            totalConfidence += product.confidenceScore;
            confidenceCount++;
          });
        }
      });

      if (confidenceCount > 0) {
        avgConfidence = totalConfidence / confidenceCount;
      }

      return {
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        supplierPhone: row.supplierPhone,
        totalSubmissions: total,
        approvedCount: approved,
        rejectedCount: rejected,
        approvalRate: Math.round(approvalRate * 10) / 10,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        lastSubmission: row.lastSubmission,
        status: approvalRate >= 90 ? 'excellent' : approvalRate >= 70 ? 'good' : 'needs-improvement',
      };
    });
  }

  async getWhatsAppAIMetrics() {
    const submissions = await this.submissionRepository.find({
      where: { processingStatus: 'completed' },
      select: ['id', 'extractedData', 'createdAt'],
    });

    if (submissions.length === 0) {
      return {
        totalProcessed: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        highConfidenceRate: 0,
        mediumConfidenceRate: 0,
        lowConfidenceRate: 0,
        confidenceDistribution: [],
      };
    }

    const totalProcessed = submissions.length;
    
    // Calculate metrics from extracted data
    let totalConfidence = 0;
    let totalProcessingTime = 0;
    let confidenceCount = 0;
    let processingTimeCount = 0;
    const confidenceScores: number[] = [];

    submissions.forEach(submission => {
      if (submission.extractedData && submission.extractedData.length > 0) {
        submission.extractedData.forEach(product => {
          totalConfidence += product.confidenceScore;
          confidenceScores.push(product.confidenceScore);
          confidenceCount++;

          if (product.extractionMetadata?.processingTime) {
            totalProcessingTime += product.extractionMetadata.processingTime;
            processingTimeCount++;
          }
        });
      }
    });

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const avgProcessingTime = processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0;

    const highConfidence = confidenceScores.filter(s => s >= 0.9).length;
    const mediumConfidence = confidenceScores.filter(s => s >= 0.7 && s < 0.9).length;
    const lowConfidence = confidenceScores.filter(s => s < 0.7).length;

    // Confidence distribution by range
    const confidenceRanges = [
      { range: '0-50%', min: 0, max: 0.5 },
      { range: '50-70%', min: 0.5, max: 0.7 },
      { range: '70-90%', min: 0.7, max: 0.9 },
      { range: '90-100%', min: 0.9, max: 1.0 },
    ];

    const confidenceDistribution = confidenceRanges.map(({ range, min, max }) => ({
      range,
      count: confidenceScores.filter(s => s >= min && s < max).length,
    }));

    const totalScores = confidenceScores.length || 1; // Avoid division by zero

    return {
      totalProcessed,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime),
      highConfidenceRate: Math.round((highConfidence / totalScores) * 100 * 10) / 10,
      mediumConfidenceRate: Math.round((mediumConfidence / totalScores) * 100 * 10) / 10,
      lowConfidenceRate: Math.round((lowConfidence / totalScores) * 100 * 10) / 10,
      confidenceDistribution,
    };
  }

  async getWhatsAppValidationTrends(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.createdAt >= :startDate', { startDate })
      .orderBy('submission.createdAt', 'ASC')
      .getMany();

    // Group by day
    const trendsByDay = submissions.reduce((acc, submission) => {
      const date = submission.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          autoApproved: 0,
        };
      }
      acc[date].total += 1;
      if (submission.validationStatus === 'pending') acc[date].pending += 1;
      if (submission.validationStatus === 'approved') {
        acc[date].approved += 1;
        // Check if it was auto-approved (validated_by is null for auto-approvals)
        if (!submission.validatedBy) acc[date].autoApproved += 1;
      }
      if (submission.validationStatus === 'rejected') acc[date].rejected += 1;
      return acc;
    }, {} as Record<string, any>);

    const trends = Object.values(trendsByDay);

    // Calculate overall stats
    const totalSubmissions = submissions.length;
    const totalApproved = submissions.filter(s => s.validationStatus === 'approved').length;
    const totalRejected = submissions.filter(s => s.validationStatus === 'rejected').length;
    const totalAutoApproved = submissions.filter(s => s.validationStatus === 'approved' && !s.validatedBy).length;

    return {
      period: `Last ${days} days`,
      summary: {
        totalSubmissions,
        totalApproved,
        totalRejected,
        totalAutoApproved,
        approvalRate: totalSubmissions > 0 ? Math.round((totalApproved / totalSubmissions) * 100 * 10) / 10 : 0,
        autoApprovalRate: totalApproved > 0 ? Math.round((totalAutoApproved / totalApproved) * 100 * 10) / 10 : 0,
      },
      trends,
    };
  }

  async getWhatsAppSystemAlerts() {
    const alerts = [];

    // Check for pending validations
    const pendingValidations = await this.submissionRepository.count({
      where: { validationStatus: 'pending' },
    });

    if (pendingValidations > 10) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        title: 'High Pending Validations',
        message: `${pendingValidations} submissions awaiting validation`,
        action: 'Review pending validations',
        actionUrl: '/admin/validations',
      });
    }

    // Check for failed submissions
    const failedSubmissions = await this.submissionRepository.count({
      where: { processingStatus: 'failed' },
    });

    if (failedSubmissions > 5) {
      alerts.push({
        type: 'error',
        severity: 'high',
        title: 'Failed Submissions',
        message: `${failedSubmissions} submissions failed processing`,
        action: 'View error details',
        actionUrl: '/admin/whatsapp/errors',
      });
    }

    // Check for stale submissions (pending for more than 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const staleSubmissions = await this.submissionRepository.count({
      where: {
        processingStatus: 'pending',
        createdAt: Between(new Date('2000-01-01'), oneDayAgo),
      },
    });

    if (staleSubmissions > 0) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        title: 'Stale Submissions',
        message: `${staleSubmissions} submissions pending for over 24 hours`,
        action: 'Process pending submissions',
        actionUrl: '/admin/whatsapp/submissions?status=pending',
      });
    }

    // Check health status
    const health = await this.healthMonitoring.performHealthCheck();
    if (health.status !== 'healthy') {
      alerts.push({
        type: 'error',
        severity: 'critical',
        title: 'System Health Issue',
        message: `Pipeline status: ${health.status}`,
        action: 'Check system health',
        actionUrl: '/admin/whatsapp',
      });
    }

    // Check for unresolved errors
    const unresolvedErrors = await this.healthMonitoring.getUnresolvedErrors();
    if (unresolvedErrors.length > 0) {
      alerts.push({
        type: 'error',
        severity: 'high',
        title: 'Unresolved Errors',
        message: `${unresolvedErrors.length} critical errors need attention`,
        action: 'Resolve errors',
        actionUrl: '/admin/whatsapp/errors',
      });
    }

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical').length,
      highCount: alerts.filter(a => a.severity === 'high').length,
      mediumCount: alerts.filter(a => a.severity === 'medium').length,
    };
  }
}