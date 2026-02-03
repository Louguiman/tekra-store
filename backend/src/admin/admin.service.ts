import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { Payment } from '../entities/payment.entity';
import { UserFiltersDto } from './dto/user-filters.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from '../orders/orders.service';
import { UpdateStockDto } from '../inventory/dto/update-stock.dto';

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
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService,
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

  async updateUserRole(id: string, role: UserRole) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    await this.userRepository.save(user);

    // Remove password hash
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async deleteUser(id: string) {
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

  async updateOrderStatus(id: string, status: OrderStatus, trackingNumber?: string) {
    return this.ordersService.updateStatus(id, { status, trackingNumber });
  }

  // Inventory Management Methods
  async getAllInventory() {
    return this.inventoryService.getAllInventoryItems();
  }

  async getLowStockItems(threshold?: number) {
    return this.inventoryService.getLowStockItems(threshold);
  }

  async updateStock(productId: string, updateStockDto: UpdateStockDto) {
    return this.inventoryService.updateStock(productId, updateStockDto);
  }

  async adjustStock(productId: string, adjustment: number, reason?: string) {
    return this.inventoryService.adjustStock(productId, adjustment, reason);
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
}