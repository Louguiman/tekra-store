import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fc from 'fast-check';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Product } from '../entities/product.entity';
import { BadRequestException } from '@nestjs/common';

/**
 * Property-Based Test for Stock Tracking and Validation
 * Feature: ecommerce-platform, Property 15: Stock Tracking and Validation
 * Validates: Requirements 6.1, 6.3, 6.4
 */
describe('Stock Tracking and Validation Property Tests', () => {
  let service: InventoryService;
  let inventoryRepository: Repository<InventoryItem>;
  let reservationRepository: Repository<StockReservation>;
  let productRepository: Repository<Product>;
  let dataSource: DataSource;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              select: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(StockReservation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
              delete: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get<Repository<InventoryItem>>(getRepositoryToken(InventoryItem));
    reservationRepository = module.get<Repository<StockReservation>>(getRepositoryToken(StockReservation));
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 15: Stock Tracking and Validation
   * For any product, the system must track stock quantities, prevent overselling during checkout, 
   * and reflect stock updates in real-time on the storefront.
   */
  describe('Property 15: Stock Tracking and Validation', () => {
    
    it('should track stock quantities accurately for all products', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary product and stock data
          fc.record({
            productId: fc.uuid(),
            initialQuantity: fc.integer({ min: 0, max: 1000 }),
            warehouseLocation: fc.string({ minLength: 1, maxLength: 100 }),
            supplierId: fc.string({ minLength: 1, maxLength: 50 }),
            lowStockThreshold: fc.integer({ min: 1, max: 50 }),
          }),
          async ({ productId, initialQuantity, warehouseLocation, supplierId, lowStockThreshold }) => {
            // Mock product exists
            const mockProduct = { id: productId, name: 'Test Product' };
            jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as Product);
            
            // Mock no existing inventory item
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(null);
            
            // Mock inventory creation and save
            const expectedInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              product: mockProduct,
              quantity: initialQuantity,
              warehouseLocation,
              supplierId,
              lowStockThreshold,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            jest.spyOn(inventoryRepository, 'create').mockReturnValue(expectedInventoryItem as InventoryItem);
            jest.spyOn(inventoryRepository, 'save').mockResolvedValue(expectedInventoryItem as InventoryItem);

            // Execute stock update
            const result = await service.updateStock(productId, {
              quantity: initialQuantity,
              warehouseLocation,
              supplierId,
              lowStockThreshold,
            });

            // Property: The system must accurately track the stock quantity
            expect(result.quantity).toBe(initialQuantity);
            expect(result.warehouseLocation).toBe(warehouseLocation);
            expect(result.supplierId).toBe(supplierId);
            expect(result.lowStockThreshold).toBe(lowStockThreshold);
            expect(inventoryRepository.save).toHaveBeenCalledWith(expectedInventoryItem);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent overselling by checking stock availability during checkout', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenarios with different stock and reservation combinations
          fc.record({
            productId: fc.uuid(),
            totalStock: fc.integer({ min: 1, max: 100 }),
            reservedQuantity: fc.integer({ min: 0, max: 50 }),
            requestedQuantity: fc.integer({ min: 1, max: 150 }),
          }),
          async ({ productId, totalStock, reservedQuantity, requestedQuantity }) => {
            // Mock inventory item with total stock
            const mockInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              quantity: totalStock,
              product: { id: productId },
            };
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
            
            // Mock reserved quantity
            const queryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: reservedQuantity.toString() }),
            };
            jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Check availability
            const isAvailable = await service.checkAvailability(productId, requestedQuantity);
            
            // Property: System must prevent overselling - available quantity = total - reserved
            const availableQuantity = totalStock - reservedQuantity;
            const expectedAvailability = availableQuantity >= requestedQuantity;
            
            expect(isAvailable).toBe(expectedAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reflect stock updates in real-time by updating inventory immediately', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate stock adjustment scenarios
          fc.record({
            productId: fc.uuid(),
            initialQuantity: fc.integer({ min: 10, max: 100 }),
            adjustment: fc.integer({ min: -50, max: 50 }),
          }),
          async ({ productId, initialQuantity, adjustment }) => {
            // Skip scenarios that would result in negative stock (handled by business logic)
            fc.pre(initialQuantity + adjustment >= 0);
            
            // Mock existing inventory item
            const mockInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              quantity: initialQuantity,
              product: { id: productId },
              warehouseLocation: 'Warehouse A',
              supplierId: 'supplier-1',
              lowStockThreshold: 10,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
            
            // Mock the updated inventory item
            const updatedInventoryItem = {
              ...mockInventoryItem,
              quantity: initialQuantity + adjustment,
              updatedAt: new Date(),
            };
            
            jest.spyOn(inventoryRepository, 'save').mockResolvedValue(updatedInventoryItem as InventoryItem);

            // Execute stock adjustment
            const result = await service.adjustStock(productId, adjustment);

            // Property: Stock updates must be reflected immediately and accurately
            expect(result.quantity).toBe(initialQuantity + adjustment);
            expect(inventoryRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                quantity: initialQuantity + adjustment,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent negative stock adjustments that would result in overselling', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate scenarios where adjustment would cause negative stock
          fc.record({
            productId: fc.uuid(),
            initialQuantity: fc.integer({ min: 1, max: 50 }),
            negativeAdjustment: fc.integer({ min: 51, max: 200 }),
          }),
          async ({ productId, initialQuantity, negativeAdjustment }) => {
            // Mock existing inventory item
            const mockInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              quantity: initialQuantity,
              product: { id: productId },
            };
            
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);

            // Property: System must prevent adjustments that would result in negative stock
            await expect(service.adjustStock(productId, -negativeAdjustment))
              .rejects.toThrow(BadRequestException);
            
            // Verify save was not called (no update should occur)
            expect(inventoryRepository.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain stock consistency during concurrent reservation attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate concurrent reservation scenarios
          fc.record({
            productId: fc.uuid(),
            totalStock: fc.integer({ min: 10, max: 100 }),
            reservation1Quantity: fc.integer({ min: 1, max: 20 }),
            reservation2Quantity: fc.integer({ min: 1, max: 20 }),
            existingReserved: fc.integer({ min: 0, max: 10 }),
          }),
          async ({ productId, totalStock, reservation1Quantity, reservation2Quantity, existingReserved }) => {
            // Mock inventory item
            const mockInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              quantity: totalStock,
              product: { id: productId },
            };
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
            
            // Mock existing reservations
            const queryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: existingReserved.toString() }),
            };
            jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Check if first reservation is possible
            const availableForReservation1 = totalStock - existingReserved;
            const canReserve1 = availableForReservation1 >= reservation1Quantity;
            
            const availability1 = await service.checkAvailability(productId, reservation1Quantity);
            expect(availability1).toBe(canReserve1);
            
            // If first reservation is possible, check second reservation considering first one
            if (canReserve1) {
              const availableForReservation2 = totalStock - existingReserved - reservation1Quantity;
              const canReserve2 = availableForReservation2 >= reservation2Quantity;
              
              // Mock updated reserved quantity after first reservation
              queryBuilder.getRawOne.mockResolvedValue({ 
                total: (existingReserved + reservation1Quantity).toString() 
              });
              
              const availability2 = await service.checkAvailability(productId, reservation2Quantity);
              
              // Property: Stock consistency must be maintained - second reservation should only succeed if enough stock remains
              expect(availability2).toBe(canReserve2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accurately calculate available stock considering active reservations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various stock and reservation combinations
          fc.record({
            productId: fc.uuid(),
            totalStock: fc.integer({ min: 0, max: 200 }),
            activeReservations: fc.array(
              fc.record({
                quantity: fc.integer({ min: 1, max: 20 }),
                expiresAt: fc.date({ min: new Date(Date.now() + 60000) }), // Future date (active)
              }),
              { minLength: 0, maxLength: 10 }
            ),
            expiredReservations: fc.array(
              fc.record({
                quantity: fc.integer({ min: 1, max: 20 }),
                expiresAt: fc.date({ max: new Date(Date.now() - 60000) }), // Past date (expired)
              }),
              { minLength: 0, maxLength: 5 }
            ),
            requestedQuantity: fc.integer({ min: 1, max: 50 }),
          }),
          async ({ productId, totalStock, activeReservations, expiredReservations, requestedQuantity }) => {
            // Mock inventory item
            const mockInventoryItem = {
              id: fc.sample(fc.uuid(), 1)[0],
              quantity: totalStock,
              product: { id: productId },
            };
            jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
            
            // Calculate total active reserved quantity (expired reservations should not count)
            const totalActiveReserved = activeReservations.reduce((sum, res) => sum + res.quantity, 0);
            
            // Mock the reserved quantity query to return only active reservations
            const queryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: totalActiveReserved.toString() }),
            };
            jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Check availability
            const isAvailable = await service.checkAvailability(productId, requestedQuantity);
            
            // Property: Available stock = total stock - active reservations (expired reservations should not affect availability)
            const availableStock = totalStock - totalActiveReserved;
            const expectedAvailability = availableStock >= requestedQuantity;
            
            expect(isAvailable).toBe(expectedAvailability);
            
            // Verify that the query correctly filters for non-expired reservations
            expect(queryBuilder.andWhere).toHaveBeenCalledWith('reservation.expiresAt > :now', { now: expect.any(Date) });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});