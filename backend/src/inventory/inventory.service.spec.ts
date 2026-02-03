import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Product } from '../entities/product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: Repository<InventoryItem>;
  let reservationRepository: Repository<StockReservation>;
  let productRepository: Repository<Product>;
  let dataSource: DataSource;

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test Description',
    brand: 'Test Brand',
    isRefurbished: false,
    refurbishedGrade: null,
    warrantyMonths: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventoryItem = {
    id: '1',
    quantity: 100,
    warehouseLocation: 'Warehouse A',
    supplierId: 'supplier-1',
    lowStockThreshold: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
  };

  const mockStockReservation = {
    id: '1',
    productId: '1',
    quantity: 5,
    reservationReference: 'ref-123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    createdAt: new Date(),
  };

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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateStock', () => {
    it('should create new inventory item when none exists', async () => {
      const updateStockDto = {
        quantity: 50,
        warehouseLocation: 'Warehouse B',
        supplierId: 'supplier-2',
        lowStockThreshold: 5,
      };

      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as Product);
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(inventoryRepository, 'create').mockReturnValue(mockInventoryItem as InventoryItem);
      jest.spyOn(inventoryRepository, 'save').mockResolvedValue(mockInventoryItem as InventoryItem);

      const result = await service.updateStock('1', updateStockDto);

      expect(result).toEqual(mockInventoryItem);
      expect(inventoryRepository.create).toHaveBeenCalledWith({
        product: mockProduct,
        quantity: 50,
        warehouseLocation: 'Warehouse B',
        supplierId: 'supplier-2',
        lowStockThreshold: 5,
      });
    });

    it('should update existing inventory item', async () => {
      const updateStockDto = {
        quantity: 75,
        warehouseLocation: 'Warehouse C',
      };

      const updatedInventoryItem = { ...mockInventoryItem, ...updateStockDto };

      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as Product);
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
      jest.spyOn(inventoryRepository, 'save').mockResolvedValue(updatedInventoryItem as InventoryItem);

      const result = await service.updateStock('1', updateStockDto);

      expect(result.quantity).toBe(75);
      expect(result.warehouseLocation).toBe('Warehouse C');
    });

    it('should throw NotFoundException when product not found', async () => {
      const updateStockDto = { quantity: 50 };

      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateStock('invalid-id', updateStockDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAvailability', () => {
    it('should return true when sufficient stock available', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
      jest.spyOn(service as any, 'getReservedQuantity').mockResolvedValue(10);

      const result = await service.checkAvailability('1', 50);

      expect(result).toBe(true);
    });

    it('should return false when insufficient stock available', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
      jest.spyOn(service as any, 'getReservedQuantity').mockResolvedValue(80);

      const result = await service.checkAvailability('1', 50);

      expect(result).toBe(false);
    });

    it('should return false when inventory item not found', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.checkAvailability('1', 50);

      expect(result).toBe(false);
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items using default threshold', async () => {
      const lowStockItem = { ...mockInventoryItem, quantity: 5 };
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([lowStockItem]),
      };

      jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.getLowStockItems();

      expect(result).toHaveLength(1);
      expect(result[0].currentQuantity).toBe(5);
      expect(result[0].productName).toBe('Test Product');
    });

    it('should return low stock items using custom threshold', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(inventoryRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.getLowStockItems(20);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.quantity <= COALESCE(:threshold, inventory.lowStockThreshold)',
        { threshold: 20 }
      );
    });
  });

  describe('reserveStock', () => {
    it('should create stock reservation successfully', async () => {
      const reservationDto = {
        productId: '1',
        quantity: 5,
        reservationReference: 'ref-123',
      };

      jest.spyOn(service, 'checkAvailability').mockResolvedValue(true);
      jest.spyOn(reservationRepository, 'create').mockReturnValue(mockStockReservation as StockReservation);
      mockQueryRunner.manager.save.mockResolvedValue(mockStockReservation);

      const result = await service.reserveStock(reservationDto);

      expect(result.quantity).toBe(5);
      expect(result.productId).toBe('1');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const reservationDto = {
        productId: '1',
        quantity: 200,
      };

      jest.spyOn(service, 'checkAvailability').mockResolvedValue(false);

      await expect(service.reserveStock(reservationDto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      jest.spyOn(reservationRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await service.releaseReservation('1');

      expect(reservationRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when reservation not found', async () => {
      jest.spyOn(reservationRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

      await expect(service.releaseReservation('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock positively', async () => {
      const adjustedInventoryItem = { ...mockInventoryItem, quantity: 110 };

      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
      jest.spyOn(inventoryRepository, 'save').mockResolvedValue(adjustedInventoryItem as InventoryItem);

      const result = await service.adjustStock('1', 10);

      expect(result.quantity).toBe(110);
    });

    it('should adjust stock negatively', async () => {
      const adjustedInventoryItem = { ...mockInventoryItem, quantity: 90 };

      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);
      jest.spyOn(inventoryRepository, 'save').mockResolvedValue(adjustedInventoryItem as InventoryItem);

      const result = await service.adjustStock('1', -10);

      expect(result.quantity).toBe(90);
    });

    it('should throw BadRequestException when adjustment results in negative quantity', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);

      await expect(service.adjustStock('1', -150)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when inventory item not found', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.adjustStock('invalid-id', 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInventoryByProductId', () => {
    it('should return inventory item when found', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(mockInventoryItem as InventoryItem);

      const result = await service.getInventoryByProductId('1');

      expect(result).toEqual(mockInventoryItem);
    });

    it('should return null when inventory item not found', async () => {
      jest.spyOn(inventoryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getInventoryByProductId('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllInventoryItems', () => {
    it('should return all inventory items', async () => {
      const inventoryItems = [mockInventoryItem];
      jest.spyOn(inventoryRepository, 'find').mockResolvedValue(inventoryItems as InventoryItem[]);

      const result = await service.getAllInventoryItems();

      expect(result).toEqual(inventoryItems);
      expect(inventoryRepository.find).toHaveBeenCalledWith({
        relations: ['product'],
        order: { updatedAt: 'DESC' },
      });
    });
  });

  describe('cleanupExpiredReservations', () => {
    it('should cleanup expired reservations', async () => {
      const queryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await service.cleanupExpiredReservations();

      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith('expiresAt < :now', { now: expect.any(Date) });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('getReservedQuantity', () => {
    it('should return total reserved quantity', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '15' }),
      };

      jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await (service as any).getReservedQuantity('1');

      expect(result).toBe(15);
    });

    it('should return 0 when no reservations found', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      jest.spyOn(reservationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await (service as any).getReservedQuantity('1');

      expect(result).toBe(0);
    });
  });
});