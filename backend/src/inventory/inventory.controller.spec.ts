import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryItem = {
    id: '1',
    quantity: 100,
    warehouseLocation: 'Warehouse A',
    supplierId: 'supplier-1',
    lowStockThreshold: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: '1',
      name: 'Test Product',
      slug: 'test-product',
    },
  };

  const mockLowStockAlert = {
    id: '1',
    productId: '1',
    productName: 'Test Product',
    currentQuantity: 5,
    lowStockThreshold: 10,
    warehouseLocation: 'Warehouse A',
    supplierId: 'supplier-1',
    lastUpdated: new Date(),
  };

  const mockStockReservation = {
    id: '1',
    productId: '1',
    quantity: 5,
    reservationReference: 'ref-123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            getAllInventoryItems: jest.fn(),
            getInventoryByProductId: jest.fn(),
            getLowStockItems: jest.fn(),
            checkAvailability: jest.fn(),
            updateStock: jest.fn(),
            adjustStock: jest.fn(),
            reserveStock: jest.fn(),
            releaseReservation: jest.fn(),
            cleanupExpiredReservations: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllInventory', () => {
    it('should return all inventory items', async () => {
      const inventoryItems = [mockInventoryItem];
      jest.spyOn(service, 'getAllInventoryItems').mockResolvedValue(inventoryItems as any);

      const result = await controller.getAllInventory();

      expect(result).toEqual(inventoryItems);
      expect(service.getAllInventoryItems).toHaveBeenCalled();
    });
  });

  describe('getInventoryByProduct', () => {
    it('should return inventory for specific product', async () => {
      jest.spyOn(service, 'getInventoryByProductId').mockResolvedValue(mockInventoryItem as any);

      const result = await controller.getInventoryByProduct('1');

      expect(result).toEqual(mockInventoryItem);
      expect(service.getInventoryByProductId).toHaveBeenCalledWith('1');
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items with default threshold', async () => {
      const lowStockItems = [mockLowStockAlert];
      jest.spyOn(service, 'getLowStockItems').mockResolvedValue(lowStockItems);

      const result = await controller.getLowStockItems();

      expect(result).toEqual(lowStockItems);
      expect(service.getLowStockItems).toHaveBeenCalledWith(undefined);
    });

    it('should return low stock items with custom threshold', async () => {
      const lowStockItems = [mockLowStockAlert];
      jest.spyOn(service, 'getLowStockItems').mockResolvedValue(lowStockItems);

      const result = await controller.getLowStockItems(20);

      expect(result).toEqual(lowStockItems);
      expect(service.getLowStockItems).toHaveBeenCalledWith(20);
    });
  });

  describe('checkAvailability', () => {
    it('should check product availability', async () => {
      jest.spyOn(service, 'checkAvailability').mockResolvedValue(true);

      const result = await controller.checkAvailability('1', 50);

      expect(result).toEqual({
        productId: '1',
        quantity: 50,
        available: true,
      });
      expect(service.checkAvailability).toHaveBeenCalledWith('1', 50);
    });
  });

  describe('updateStock', () => {
    it('should update stock for product', async () => {
      const updateStockDto = {
        quantity: 75,
        warehouseLocation: 'Warehouse B',
        supplierId: 'supplier-2',
        lowStockThreshold: 15,
      };

      const updatedInventoryItem = { ...mockInventoryItem, ...updateStockDto };
      jest.spyOn(service, 'updateStock').mockResolvedValue(updatedInventoryItem as any);

      const result = await controller.updateStock('1', updateStockDto);

      expect(result).toEqual(updatedInventoryItem);
      expect(service.updateStock).toHaveBeenCalledWith('1', updateStockDto);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock for product', async () => {
      const adjustmentBody = { adjustment: 10, reason: 'Restock' };
      const adjustedInventoryItem = { ...mockInventoryItem, quantity: 110 };

      jest.spyOn(service, 'adjustStock').mockResolvedValue(adjustedInventoryItem as any);

      const result = await controller.adjustStock('1', adjustmentBody);

      expect(result).toEqual(adjustedInventoryItem);
      expect(service.adjustStock).toHaveBeenCalledWith('1', 10, 'Restock');
    });
  });

  describe('createReservation', () => {
    it('should create stock reservation', async () => {
      const reservationDto = {
        productId: '1',
        quantity: 5,
        reservationReference: 'ref-123',
      };

      jest.spyOn(service, 'reserveStock').mockResolvedValue(mockStockReservation as any);

      const result = await controller.createReservation(reservationDto);

      expect(result).toEqual(mockStockReservation);
      expect(service.reserveStock).toHaveBeenCalledWith(reservationDto);
    });
  });

  describe('releaseReservation', () => {
    it('should release stock reservation', async () => {
      jest.spyOn(service, 'releaseReservation').mockResolvedValue();

      const result = await controller.releaseReservation('1');

      expect(result).toEqual({ message: 'Reservation released successfully' });
      expect(service.releaseReservation).toHaveBeenCalledWith('1');
    });
  });

  describe('cleanupExpiredReservations', () => {
    it('should cleanup expired reservations', async () => {
      jest.spyOn(service, 'cleanupExpiredReservations').mockResolvedValue();

      const result = await controller.cleanupExpiredReservations();

      expect(result).toEqual({ message: 'Expired reservations cleaned up successfully' });
      expect(service.cleanupExpiredReservations).toHaveBeenCalled();
    });
  });
});