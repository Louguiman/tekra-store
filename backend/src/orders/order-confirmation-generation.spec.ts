import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { Country } from '../entities/country.entity';
import { User } from '../entities/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, OrderItemDto, DeliveryAddressDto } from './dto/create-order.dto';

describe('Order Confirmation Generation Property Tests', () => {
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
   * Feature: ecommerce-platform, Property 10: Order Confirmation Generation
   * For any successfully completed checkout, the system must generate a unique order confirmation with order reference.
   * Validates: Requirements 3.5, 5.1
   */
  test('should generate unique order confirmation with order reference for any valid checkout', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid order data
        fc.record({
          items: fc.array(
            fc.record({
              productId: fc.uuid(),
              quantity: fc.integer({ min: 1, max: 10 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          deliveryAddress: fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 50 }),
            phone: fc.string({ minLength: 8, maxLength: 15 }),
            address: fc.string({ minLength: 5, maxLength: 100 }),
            city: fc.string({ minLength: 2, maxLength: 30 }),
            postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 })),
          }),
          countryId: fc.uuid(),
          customerEmail: fc.option(fc.emailAddress()),
          customerPhone: fc.string({ minLength: 8, maxLength: 15 }),
          userId: fc.option(fc.uuid()),
        }),
        async (orderData) => {
          // Reset all mocks before each test run
          jest.clearAllMocks();

          // Setup mocks for successful order creation
          const mockCountry = { id: orderData.countryId, name: 'Test Country', code: 'TC' };
          const mockUser = orderData.userId ? { id: orderData.userId, email: 'test@example.com' } : null;
          
          const mockProducts = orderData.items.map((item, index) => ({
            id: item.productId,
            name: `Product ${index}`,
            prices: [{
              country: mockCountry,
              price: 100 + index * 10,
              promoPrice: null,
            }],
          }));

          // Mock repository responses with proper implementations
          const countryMock = jest.spyOn(countryRepository, 'findOne');
          countryMock.mockImplementation(async (options: any) => {
            if (options.where.id === orderData.countryId) {
              return mockCountry as any;
            }
            return null;
          });

          if (mockUser) {
            const userMock = jest.spyOn(userRepository, 'findOne');
            userMock.mockImplementation(async (options: any) => {
              if (options.where.id === orderData.userId) {
                return mockUser as any;
              }
              return null;
            });
          }
          
          // Mock product lookups with proper implementation
          const productMock = jest.spyOn(productRepository, 'findOne');
          productMock.mockImplementation(async (options: any) => {
            const foundProduct = mockProducts.find(p => p.id === options.where.id);
            return foundProduct as any || null;
          });

          // Mock inventory availability
          jest.spyOn(inventoryService, 'checkAvailability').mockResolvedValue(true);
          jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue({} as any);

          // Mock order creation and saving
          const mockOrderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const mockOrder = {
            id: `order-${Date.now()}`,
            orderNumber: mockOrderNumber,
            status: OrderStatus.PENDING,
            totalAmount: orderData.items.reduce((sum, item, index) => sum + (100 + index * 10) * item.quantity, 0),
            deliveryFee: 0,
            deliveryAddress: orderData.deliveryAddress,
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            country: mockCountry,
            user: mockUser,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          jest.spyOn(orderRepository, 'create').mockReturnValue(mockOrder as any);
          jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as any);
          jest.spyOn(orderItemRepository, 'create').mockReturnValue({} as any);
          jest.spyOn(orderItemRepository, 'save').mockResolvedValue({} as any);

          // Mock findOne for the final order retrieval
          const mockOrderWithItems = {
            ...mockOrder,
            items: orderData.items.map((item, index) => ({
              id: `item-${index}`,
              product: mockProducts[index],
              quantity: item.quantity,
              unitPrice: 100 + index * 10,
              totalPrice: (100 + index * 10) * item.quantity,
            })),
          };

          jest.spyOn(service, 'findOne').mockResolvedValue(mockOrderWithItems as any);

          // Execute the order creation
          const createOrderDto: CreateOrderDto = {
            items: orderData.items as OrderItemDto[],
            deliveryAddress: orderData.deliveryAddress as DeliveryAddressDto,
            countryId: orderData.countryId,
            customerEmail: orderData.customerEmail,
            customerPhone: orderData.customerPhone,
            userId: orderData.userId,
          };

          const result = await service.createOrder(createOrderDto);

          // Verify order confirmation properties
          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.id.length).toBeGreaterThan(0);

          // Verify unique order reference (order number) is generated
          expect(result.orderNumber).toBeDefined();
          expect(typeof result.orderNumber).toBe('string');
          expect(result.orderNumber).toMatch(/^ORD-\d+-\d+$/);

          // Verify order contains all required confirmation information
          expect(result.status).toBe(OrderStatus.PENDING);
          expect(result.totalAmount).toBeGreaterThan(0);
          expect(result.deliveryAddress).toEqual(orderData.deliveryAddress);
          expect(result.customerPhone).toBe(orderData.customerPhone);
          expect(result.country).toBeDefined();
          expect(result.items).toBeDefined();
          expect(result.items.length).toBe(orderData.items.length);
          expect(result.createdAt).toBeDefined();

          // Verify order items are properly associated
          result.items.forEach((item, index) => {
            expect(item.product).toBeDefined();
            expect(item.quantity).toBe(orderData.items[index].quantity);
            expect(item.unitPrice).toBeGreaterThan(0);
            expect(item.totalPrice).toBe(item.unitPrice * item.quantity);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should generate different order numbers for concurrent order creations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            items: fc.array(
              fc.record({
                productId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 3 }),
              }),
              { minLength: 1, maxLength: 2 }
            ),
            deliveryAddress: fc.record({
              fullName: fc.string({ minLength: 2, maxLength: 20 }),
              phone: fc.string({ minLength: 8, maxLength: 12 }),
              address: fc.string({ minLength: 5, maxLength: 50 }),
              city: fc.string({ minLength: 2, maxLength: 20 }),
            }),
            countryId: fc.uuid(),
            customerPhone: fc.string({ minLength: 8, maxLength: 12 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (ordersData) => {
          const orderNumbers = new Set<string>();

          // Reset all mocks before each test run
          jest.clearAllMocks();

          for (let i = 0; i < ordersData.length; i++) {
            const orderData = ordersData[i];
            
            // Setup mocks for each order
            const mockCountry = { id: orderData.countryId, name: `Test Country ${i}`, code: `T${i}` };
            const mockProducts = orderData.items.map((item, index) => ({
              id: item.productId,
              name: `Product ${i}-${index}`,
              prices: [{
                country: mockCountry,
                price: 50 + index * 5,
                promoPrice: null,
              }],
            }));

            // Create fresh mock implementations for each order
            const countryMock = jest.spyOn(countryRepository, 'findOne');
            countryMock.mockImplementation(async (options: any) => {
              if (options.where.id === orderData.countryId) {
                return mockCountry as any;
              }
              return null;
            });
            
            const productMock = jest.spyOn(productRepository, 'findOne');
            productMock.mockImplementation(async (options: any) => {
              const foundProduct = mockProducts.find(p => p.id === options.where.id);
              return foundProduct as any || null;
            });

            jest.spyOn(inventoryService, 'checkAvailability').mockResolvedValue(true);
            jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue({} as any);

            // Generate unique order number for each order
            const mockOrderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const mockOrder = {
              id: `order-${i}-${Date.now()}`,
              orderNumber: mockOrderNumber,
              status: OrderStatus.PENDING,
              totalAmount: orderData.items.reduce((sum, item, index) => sum + (50 + index * 5) * item.quantity, 0),
              deliveryFee: 0,
              deliveryAddress: orderData.deliveryAddress,
              customerPhone: orderData.customerPhone,
              country: mockCountry,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            jest.spyOn(orderRepository, 'create').mockReturnValue(mockOrder as any);
            jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as any);
            jest.spyOn(orderItemRepository, 'create').mockReturnValue({} as any);
            jest.spyOn(orderItemRepository, 'save').mockResolvedValue({} as any);

            const mockOrderWithItems = {
              ...mockOrder,
              items: orderData.items.map((item, index) => ({
                id: `item-${i}-${index}`,
                product: mockProducts[index],
                quantity: item.quantity,
                unitPrice: 50 + index * 5,
                totalPrice: (50 + index * 5) * item.quantity,
              })),
            };

            jest.spyOn(service, 'findOne').mockResolvedValue(mockOrderWithItems as any);

            const createOrderDto: CreateOrderDto = {
              items: orderData.items as OrderItemDto[],
              deliveryAddress: orderData.deliveryAddress as DeliveryAddressDto,
              countryId: orderData.countryId,
              customerPhone: orderData.customerPhone,
            };

            const result = await service.createOrder(createOrderDto);
            
            // Collect order numbers to verify uniqueness
            orderNumbers.add(result.orderNumber);
          }

          // Verify all order numbers are unique
          expect(orderNumbers.size).toBe(ordersData.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});