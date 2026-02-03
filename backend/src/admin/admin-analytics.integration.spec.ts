import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from '../orders/orders.service';

describe('AdminService Analytics Integration', () => {
  let service: AdminService;
  let mockUserRepository: any;
  let mockOrderRepository: any;
  let mockProductRepository: any;
  let mockInventoryRepository: any;
  let mockCountryRepository: any;
  let mockInventoryService: any;
  let mockOrdersService: any;

  beforeEach(async () => {
    // Mock repositories
    mockUserRepository = {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockOrderRepository = {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
        getManyAndCount: jest.fn(),
      }),
    };

    mockProductRepository = {
      count: jest.fn(),
    };

    mockInventoryRepository = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      }),
    };

    mockCountryRepository = {
      find: jest.fn(),
    };

    mockInventoryService = {
      getAllInventoryItems: jest.fn(),
      getLowStockItems: jest.fn(),
      updateStock: jest.fn(),
      adjustStock: jest.fn(),
    };

    mockOrdersService = {
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: mockInventoryRepository,
        },
        {
          provide: getRepositoryToken(Country),
          useValue: mockCountryRepository,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('Analytics Functionality', () => {
    it('should get dashboard stats successfully', async () => {
      // Mock data
      mockUserRepository.count.mockResolvedValue(100);
      mockOrderRepository.count.mockResolvedValueOnce(50); // total orders
      mockOrderRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '25000' });
      mockOrderRepository.count.mockResolvedValueOnce(10); // pending orders
      mockOrderRepository.count.mockResolvedValueOnce(40); // completed orders
      mockProductRepository.count.mockResolvedValue(200);
      mockInventoryRepository.count.mockResolvedValue(15);
      mockOrderRepository.find.mockResolvedValue([]);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 100,
        totalOrders: 50,
        totalRevenue: 25000,
        pendingOrders: 10,
        completedOrders: 40,
        totalProducts: 200,
        lowStockProducts: 15,
        recentOrders: [],
      });
    });

    it('should get orders by country successfully', async () => {
      const mockCountryData = [
        {
          countryCode: 'ML',
          countryName: 'Mali',
          orderCount: '25',
          totalRevenue: '15000',
        },
        {
          countryCode: 'CI',
          countryName: 'Côte d\'Ivoire',
          orderCount: '20',
          totalRevenue: '12000',
        },
      ];

      mockOrderRepository.createQueryBuilder().getRawMany.mockResolvedValue(mockCountryData);

      const result = await service.getOrdersByCountry();

      expect(result).toEqual([
        {
          countryCode: 'ML',
          countryName: 'Mali',
          orderCount: 25,
          totalRevenue: 15000,
        },
        {
          countryCode: 'CI',
          countryName: 'Côte d\'Ivoire',
          orderCount: 20,
          totalRevenue: 12000,
        },
      ]);
    });

    it('should get revenue report successfully', async () => {
      const mockOrders = [
        {
          id: '1',
          totalAmount: 5000,
          createdAt: new Date('2024-01-15'),
          payments: [{ method: 'orange_money', status: 'completed' }],
        },
        {
          id: '2',
          totalAmount: 7500,
          createdAt: new Date('2024-01-16'),
          payments: [{ method: 'wave', status: 'completed' }],
        },
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.getRevenueReport('2024-01-01', '2024-01-31');

      expect(result.totalRevenue).toBe(12500);
      expect(result.orderCount).toBe(2);
      expect(result.averageOrderValue).toBe(6250);
      expect(result.revenueByDay).toHaveLength(2);
      expect(result.revenueByPaymentMethod).toHaveLength(2);
    });

    it('should get payment method statistics successfully', async () => {
      const mockPaymentStats = [
        {
          paymentMethod: 'orange_money',
          orderCount: '15',
          totalRevenue: '75000',
          averageOrderValue: '5000',
        },
        {
          paymentMethod: 'wave',
          orderCount: '10',
          totalRevenue: '60000',
          averageOrderValue: '6000',
        },
      ];

      mockOrderRepository.createQueryBuilder().getRawMany.mockResolvedValue(mockPaymentStats);

      const result = await service.getPaymentMethodStatistics();

      expect(result).toEqual([
        {
          paymentMethod: 'orange_money',
          orderCount: 15,
          totalRevenue: 75000,
          averageOrderValue: 5000,
        },
        {
          paymentMethod: 'wave',
          orderCount: 10,
          totalRevenue: 60000,
          averageOrderValue: 6000,
        },
      ]);
    });

    it('should get stock level report successfully', async () => {
      const mockInventoryItems = [
        {
          id: '1',
          quantity: 50,
          lowStockThreshold: 10,
          product: {
            id: 'p1',
            name: 'iPhone 13',
            category: { name: 'Smartphones' },
            prices: [{ price: 500000 }],
          },
        },
        {
          id: '2',
          quantity: 5,
          lowStockThreshold: 10,
          product: {
            id: 'p2',
            name: 'MacBook Pro',
            category: { name: 'Laptops' },
            prices: [{ price: 1200000 }],
          },
        },
      ];

      mockInventoryRepository.find.mockResolvedValue(mockInventoryItems);

      const result = await service.getStockLevelReport();

      expect(result.summary.totalProducts).toBe(2);
      expect(result.summary.lowStockCount).toBe(1);
      expect(result.summary.outOfStockCount).toBe(0);
      expect(result.stockByCategory).toHaveLength(2);
      expect(result.lowStockItems).toHaveLength(1);
    });

    it('should handle invalid date range in revenue report', async () => {
      await expect(
        service.getRevenueReport('2024-01-31', '2024-01-01')
      ).rejects.toThrow('Start date must be before end date');
    });
  });
});