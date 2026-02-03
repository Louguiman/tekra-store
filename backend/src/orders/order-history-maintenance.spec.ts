import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { Country } from '../entities/country.entity';
import { User, UserRole } from '../entities/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Order History Maintenance Property Tests', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let productRepository: Repository<Product>;
  let countryRepository: Repository<Country>;
  let userRepository: Repository<User>;
  let inventoryService: InventoryService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Country),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            checkAvailability: jest.fn(),
            reserveStock: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendOrderConfirmationNotification: jest.fn(),
            sendOrderStatusNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    countryRepository = module.get<Repository<Country>>(getRepositoryToken(Country));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    inventoryService = module.get<InventoryService>(InventoryService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  /**
   * Feature: ecommerce-platform, Property 13: Order History Maintenance
   * For any registered customer, their order history must be maintained and accessible through their account.
   * Validates: Requirements 5.3
   */
  test('should maintain and provide access to order history for any registered customer', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user and their orders
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            fullName: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 8, maxLength: 15 }),
            role: fc.constantFrom(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.STAFF),
            countryCode: fc.constantFrom('ML', 'CI', 'BF'),
          }),
          orders: fc.array(
            fc.record({
              id: fc.uuid(),
              orderNumber: fc.string({ minLength: 10, maxLength: 20 }),
              status: fc.constantFrom(...Object.values(OrderStatus)),
              totalAmount: fc.float({ min: 10, max: 10000, noNaN: true }),
              deliveryFee: fc.float({ min: 0, max: 100, noNaN: true }),
              deliveryAddress: fc.record({
                fullName: fc.string({ minLength: 2, maxLength: 50 }),
                phone: fc.string({ minLength: 8, maxLength: 15 }),
                address: fc.string({ minLength: 5, maxLength: 100 }),
                city: fc.string({ minLength: 2, maxLength: 30 }),
                postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 })),
              }),
              customerEmail: fc.option(fc.emailAddress()),
              customerPhone: fc.string({ minLength: 8, maxLength: 15 }),
              createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              items: fc.array(
                fc.record({
                  id: fc.uuid(),
                  quantity: fc.integer({ min: 1, max: 10 }),
                  unitPrice: fc.float({ min: 5, max: 1000, noNaN: true }),
                  totalPrice: fc.float({ min: 5, max: 10000, noNaN: true }),
                  product: fc.record({
                    id: fc.uuid(),
                    name: fc.string({ minLength: 3, maxLength: 100 }),
                    slug: fc.string({ minLength: 3, maxLength: 100 }),
                    brand: fc.string({ minLength: 2, maxLength: 50 }),
                  }),
                }),
                { minLength: 1, maxLength: 5 }
              ),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          country: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 50 }),
            code: fc.constantFrom('ML', 'CI', 'BF'),
          }),
        }),
        async (testData) => {
          // Reset all mocks before each test run
          jest.clearAllMocks();

          const { user, orders, country } = testData;

          // Setup mock orders with proper relationships
          const mockOrders = orders.map(order => ({
            ...order,
            user: user,
            country: country,
            items: order.items.map(item => ({
              ...item,
              order: { id: order.id },
              product: {
                ...item.product,
                images: [],
              },
            })),
          }));

          // Mock the repository find method to return orders for the user
          const orderFindMock = jest.spyOn(orderRepository, 'find');
          orderFindMock.mockImplementation(async (options: any) => {
            // Check if this is a findByUser call
            if (options?.where?.user?.id === user.id) {
              // Return a deep copy to avoid reference issues and ensure proper sorting
              const sortedOrders = [...mockOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              return sortedOrders as any;
            }
            return [];
          });

          // Execute the findByUser method
          const result = await service.findByUser(user.id);

          // Verify order history maintenance properties
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(orders.length);

          // Verify all returned orders belong to the user
          result.forEach(order => {
            expect(order.user).toBeDefined();
            expect(order.user.id).toBe(user.id);
          });

          // Verify orders are sorted by creation date (most recent first)
          if (result.length > 1) {
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(result[i + 1].createdAt.getTime());
            }
          }

          // Verify each order contains complete information
          result.forEach((order, index) => {
            const expectedOrder = mockOrders.find(o => o.id === order.id);
            expect(expectedOrder).toBeDefined();
            
            // Verify order basic properties
            expect(order.id).toBe(expectedOrder.id);
            expect(order.orderNumber).toBe(expectedOrder.orderNumber);
            expect(order.status).toBe(expectedOrder.status);
            expect(order.totalAmount).toBe(expectedOrder.totalAmount);
            expect(order.deliveryFee).toBe(expectedOrder.deliveryFee);
            expect(order.deliveryAddress).toEqual(expectedOrder.deliveryAddress);
            expect(order.customerPhone).toBe(expectedOrder.customerPhone);
            expect(order.createdAt).toEqual(expectedOrder.createdAt);
            expect(order.updatedAt).toEqual(expectedOrder.updatedAt);

            // Verify order items are included
            expect(order.items).toBeDefined();
            expect(Array.isArray(order.items)).toBe(true);
            expect(order.items.length).toBe(expectedOrder.items.length);

            // Verify each order item contains product information
            order.items.forEach((item, itemIndex) => {
              const expectedItem = expectedOrder.items[itemIndex];
              expect(expectedItem).toBeDefined();
              expect(item.quantity).toBe(expectedItem.quantity);
              expect(item.unitPrice).toBe(expectedItem.unitPrice);
              expect(item.totalPrice).toBe(expectedItem.totalPrice);
              expect(item.product).toBeDefined();
              expect(item.product.id).toBe(expectedItem.product.id);
              // Only verify that product has required fields, not exact values
              expect(typeof item.product.name).toBe('string');
              expect(item.product.name.length).toBeGreaterThan(0);
            });

            // Verify country information is included
            expect(order.country).toBeDefined();
            expect(order.country.id).toBe(country.id);
            expect(order.country.code).toBe(country.code);
          });

          // Verify the repository was called with correct parameters
          expect(orderFindMock).toHaveBeenCalledWith({
            where: { user: { id: user.id } },
            relations: ['items', 'items.product', 'items.product.images', 'country'],
            order: { createdAt: 'DESC' },
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return empty array for users with no order history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
        }),
        async (testData) => {
          // Reset all mocks before each test run
          jest.clearAllMocks();

          // Mock empty order history
          const orderFindMock = jest.spyOn(orderRepository, 'find');
          orderFindMock.mockResolvedValue([]);

          // Execute the findByUser method
          const result = await service.findByUser(testData.userId);

          // Verify empty order history is handled correctly
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(0);

          // Verify the repository was called with correct parameters
          expect(orderFindMock).toHaveBeenCalledWith({
            where: { user: { id: testData.userId } },
            relations: ['items', 'items.product', 'items.product.images', 'country'],
            order: { createdAt: 'DESC' },
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain order history across different order statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          orderStatuses: fc.array(
            fc.constantFrom(...Object.values(OrderStatus)),
            { minLength: 1, maxLength: Object.values(OrderStatus).length }
          ),
        }),
        async (testData) => {
          // Reset all mocks before each test run
          jest.clearAllMocks();

          const { userId, orderStatuses } = testData;

          // Create mock orders with different statuses
          const mockOrders = orderStatuses.map((status, index) => ({
            id: `order-${index}`,
            orderNumber: `ORD-${Date.now()}-${index}`,
            status: status,
            totalAmount: 100 + index * 10,
            deliveryFee: 5,
            deliveryAddress: {
              fullName: `Customer ${index}`,
              phone: `+22312345${index}`,
              address: `Address ${index}`,
              city: `City ${index}`,
            },
            customerPhone: `+22312345${index}`,
            createdAt: new Date(Date.now() - index * 86400000), // Different dates
            updatedAt: new Date(Date.now() - index * 86400000),
            user: { id: userId },
            country: { id: 'country-1', code: 'ML', name: 'Mali' },
            items: [{
              id: `item-${index}`,
              quantity: 1,
              unitPrice: 100 + index * 10,
              totalPrice: 100 + index * 10,
              product: {
                id: `product-${index}`,
                name: `Product ${index}`,
                images: [],
              },
            }],
          }));

          // Mock the repository find method
          const orderFindMock = jest.spyOn(orderRepository, 'find');
          orderFindMock.mockResolvedValue(mockOrders as any);

          // Execute the findByUser method
          const result = await service.findByUser(userId);

          // Verify all order statuses are maintained in history
          expect(result).toBeDefined();
          expect(result.length).toBe(orderStatuses.length);

          // Verify each status is represented
          const resultStatuses = result.map(order => order.status);
          orderStatuses.forEach(status => {
            expect(resultStatuses).toContain(status);
          });

          // Verify orders with different statuses are all accessible
          result.forEach(order => {
            expect(Object.values(OrderStatus)).toContain(order.status);
            expect(order.user.id).toBe(userId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});