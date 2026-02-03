import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fc from 'fast-check';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Product } from '../entities/product.entity';

/**
 * Property-Based Test for Low Stock Alerts
 * Feature: ecommerce-platform, Property 16: Low Stock Alerts
 * Validates: Requirements 6.2
 */
describe('Low Stock Alerts Property Tests', () => {
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
   * Property 16: Low Stock Alerts
   * For any product with stock below the configured threshold, the system must generate alerts for admin users.
   */
  describe('Property 16: Low Stock Alerts', () => {
    
    it('should generate alerts for all products with stock below their individual thresholds', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a collection of inventory items with various stock levels and thresholds
          fc.array(
            fc.record({
              id: fc.uuid(),
              productId: fc.uuid(),
              productName: fc.string({ minLength: 1, maxLength: 100 }),
              currentQuantity: fc.integer({ min: 0, max: 100 }),
              lowStockThreshold: fc.integer({ min: 1, max: 50 }),
              warehouseLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              supplierId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (inventoryItems) => {
            // Create mock inventory items and products
            const mockInventoryItems = inventoryItems.map(item => ({
              id: item.id,
              quantity: item.currentQuantity,
              lowStockThreshold: item.lowStockThreshold,
              warehouseLocation: item.warehouseLocation || null,
              supplierId: item.supplierId || null,
              updatedAt: new Date(),
              product: {
                id: item.productId,
                name: item.productName,
              },
            }));

            // Filter items that should be in low stock alerts (quantity <= threshold)
            const expectedLowStockItems = inventoryItems.filter(
              item => item.currentQuantity <= item.lowStockThreshold
            );

            // Mock the query builder to return items that meet the low stock criteria
            const queryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(
                mockInventoryItems.filter(item => 
                  item.quantity <= item.lowStockThreshold
                )
              ),
            };
            jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Execute getLowStockItems without custom threshold (use individual thresholds)
            const result = await service.getLowStockItems();

            // Property: All products with stock <= their individual threshold should be included
            expect(result).toHaveLength(expectedLowStockItems.length);
            
            // Verify each returned item meets the low stock criteria
            result.forEach(alertItem => {
              const originalItem = inventoryItems.find(item => item.id === alertItem.id);
              expect(originalItem).toBeDefined();
              expect(originalItem!.currentQuantity).toBeLessThanOrEqual(originalItem!.lowStockThreshold);
              
              // Verify alert contains all required information
              expect(alertItem.productId).toBe(originalItem!.productId);
              expect(alertItem.productName).toBe(originalItem!.productName);
              expect(alertItem.currentQuantity).toBe(originalItem!.currentQuantity);
              expect(alertItem.lowStockThreshold).toBe(originalItem!.lowStockThreshold);
              expect(alertItem.warehouseLocation).toBe(originalItem!.warehouseLocation);
              expect(alertItem.supplierId).toBe(originalItem!.supplierId);
              expect(alertItem.lastUpdated).toBeInstanceOf(Date);
            });

            // Verify the correct SQL query was constructed
            expect(queryBuilder.where).toHaveBeenCalledWith(
              'inventory.quantity <= COALESCE(:threshold, inventory.lowStockThreshold)',
              { threshold: undefined }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate alerts for all products with stock below a custom threshold when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate inventory items and a custom threshold
          fc.record({
            customThreshold: fc.integer({ min: 1, max: 100 }),
            inventoryItems: fc.array(
              fc.record({
                id: fc.uuid(),
                productId: fc.uuid(),
                productName: fc.string({ minLength: 1, maxLength: 100 }),
                currentQuantity: fc.integer({ min: 0, max: 150 }),
                individualThreshold: fc.integer({ min: 1, max: 50 }),
                warehouseLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
                supplierId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
              }),
              { minLength: 1, maxLength: 15 }
            ),
          }),
          async ({ customThreshold, inventoryItems }) => {
            // Create mock inventory items
            const mockInventoryItems = inventoryItems.map(item => ({
              id: item.id,
              quantity: item.currentQuantity,
              lowStockThreshold: item.individualThreshold,
              warehouseLocation: item.warehouseLocation || null,
              supplierId: item.supplierId || null,
              updatedAt: new Date(),
              product: {
                id: item.productId,
                name: item.productName,
              },
            }));

            // Filter items that should be in low stock alerts using custom threshold
            const expectedLowStockItems = inventoryItems.filter(
              item => item.currentQuantity <= customThreshold
            );

            // Mock the query builder to return items that meet the custom threshold criteria
            const queryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(
                mockInventoryItems.filter(item => 
                  item.quantity <= customThreshold
                )
              ),
            };
            jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Execute getLowStockItems with custom threshold
            const result = await service.getLowStockItems(customThreshold);

            // Property: All products with stock <= custom threshold should be included (ignoring individual thresholds)
            expect(result).toHaveLength(expectedLowStockItems.length);
            
            // Verify each returned item meets the custom threshold criteria
            result.forEach(alertItem => {
              const originalItem = inventoryItems.find(item => item.id === alertItem.id);
              expect(originalItem).toBeDefined();
              expect(originalItem!.currentQuantity).toBeLessThanOrEqual(customThreshold);
              
              // Verify alert contains all required information
              expect(alertItem.productId).toBe(originalItem!.productId);
              expect(alertItem.productName).toBe(originalItem!.productName);
              expect(alertItem.currentQuantity).toBe(originalItem!.currentQuantity);
              expect(alertItem.lowStockThreshold).toBe(originalItem!.individualThreshold);
            });

            // Verify the correct SQL query was constructed with custom threshold
            expect(queryBuilder.where).toHaveBeenCalledWith(
              'inventory.quantity <= COALESCE(:threshold, inventory.lowStockThreshold)',
              { threshold: customThreshold }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not generate alerts for products with stock above thresholds', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate inventory items where all have stock above their thresholds
          fc.array(
            fc.record({
              id: fc.uuid(),
              productId: fc.uuid(),
              productName: fc.string({ minLength: 1, maxLength: 100 }),
              lowStockThreshold: fc.integer({ min: 1, max: 30 }),
              stockAboveThreshold: fc.integer({ min: 1, max: 50 }), // Additional stock above threshold
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (inventoryItems) => {
            // Calculate quantities that are above thresholds
            const itemsWithSafeStock = inventoryItems.map(item => ({
              ...item,
              currentQuantity: item.lowStockThreshold + item.stockAboveThreshold,
            }));

            // Create mock inventory items with safe stock levels
            const mockInventoryItems = itemsWithSafeStock.map(item => ({
              id: item.id,
              quantity: item.currentQuantity,
              lowStockThreshold: item.lowStockThreshold,
              warehouseLocation: null,
              supplierId: null,
              updatedAt: new Date(),
              product: {
                id: item.productId,
                name: item.productName,
              },
            }));

            // Mock the query builder to return empty array (no items meet low stock criteria)
            const queryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]), // No low stock items
            };
            jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Execute getLowStockItems
            const result = await service.getLowStockItems();

            // Property: No alerts should be generated when all products have stock above their thresholds
            expect(result).toHaveLength(0);
            
            // Verify that all items indeed have stock above their thresholds
            itemsWithSafeStock.forEach(item => {
              expect(item.currentQuantity).toBeGreaterThan(item.lowStockThreshold);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all required alert information for admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate low stock inventory items
          fc.array(
            fc.record({
              id: fc.uuid(),
              productId: fc.uuid(),
              productName: fc.string({ minLength: 1, maxLength: 100 }),
              currentQuantity: fc.integer({ min: 0, max: 10 }),
              lowStockThreshold: fc.integer({ min: 11, max: 50 }), // Threshold higher than quantity
              warehouseLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              supplierId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            }),
            { minLength: 1, maxLength: 8 }
          ),
          async (inventoryItems) => {
            // Create mock inventory items (all are low stock by design)
            const mockInventoryItems = inventoryItems.map(item => ({
              id: item.id,
              quantity: item.currentQuantity,
              lowStockThreshold: item.lowStockThreshold,
              warehouseLocation: item.warehouseLocation || null,
              supplierId: item.supplierId || null,
              updatedAt: new Date(),
              product: {
                id: item.productId,
                name: item.productName,
              },
            }));

            // Mock the query builder to return all items (all are low stock)
            const queryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(mockInventoryItems),
            };
            jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Execute getLowStockItems
            const result = await service.getLowStockItems();

            // Property: Each alert must contain all required information for admin users
            expect(result).toHaveLength(inventoryItems.length);
            
            result.forEach((alertItem, index) => {
              const originalItem = inventoryItems[index];
              
              // Verify all required fields are present and correct
              expect(alertItem.id).toBe(originalItem.id);
              expect(alertItem.productId).toBe(originalItem.productId);
              expect(alertItem.productName).toBe(originalItem.productName);
              expect(alertItem.currentQuantity).toBe(originalItem.currentQuantity);
              expect(alertItem.lowStockThreshold).toBe(originalItem.lowStockThreshold);
              expect(alertItem.warehouseLocation).toBe(originalItem.warehouseLocation);
              expect(alertItem.supplierId).toBe(originalItem.supplierId);
              expect(alertItem.lastUpdated).toBeInstanceOf(Date);
              
              // Verify the alert is indeed for a low stock item
              expect(alertItem.currentQuantity).toBeLessThanOrEqual(alertItem.lowStockThreshold);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases with zero stock and zero thresholds correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case scenarios
          fc.array(
            fc.record({
              id: fc.uuid(),
              productId: fc.uuid(),
              productName: fc.string({ minLength: 1, maxLength: 100 }),
              currentQuantity: fc.constantFrom(0), // Zero stock
              lowStockThreshold: fc.integer({ min: 0, max: 10 }),
              warehouseLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              supplierId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (inventoryItems) => {
            // Create mock inventory items with zero stock
            const mockInventoryItems = inventoryItems.map(item => ({
              id: item.id,
              quantity: item.currentQuantity,
              lowStockThreshold: item.lowStockThreshold,
              warehouseLocation: item.warehouseLocation || null,
              supplierId: item.supplierId || null,
              updatedAt: new Date(),
              product: {
                id: item.productId,
                name: item.productName,
              },
            }));

            // All items should trigger alerts since quantity (0) <= any threshold >= 0
            const queryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(mockInventoryItems),
            };
            jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

            // Execute getLowStockItems
            const result = await service.getLowStockItems();

            // Property: Zero stock should always trigger alerts regardless of threshold
            expect(result).toHaveLength(inventoryItems.length);
            
            result.forEach(alertItem => {
              expect(alertItem.currentQuantity).toBe(0);
              expect(alertItem.currentQuantity).toBeLessThanOrEqual(alertItem.lowStockThreshold);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});