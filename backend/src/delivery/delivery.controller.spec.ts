import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryType } from '../entities/delivery-method.entity';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let service: DeliveryService;

  const mockDeliveryService = {
    getDeliveryMethodsByCountry: jest.fn(),
    getPickupPointsByCountry: jest.fn(),
    calculateDeliveryFee: jest.fn(),
    getDeliveryTracking: jest.fn(),
    getDeliveryTrackingByOrder: jest.fn(),
    createDeliveryMethod: jest.fn(),
    updateDeliveryMethod: jest.fn(),
    createPickupPoint: jest.fn(),
    updatePickupPoint: jest.fn(),
    createDeliveryTracking: jest.fn(),
    updateDeliveryTracking: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        {
          provide: DeliveryService,
          useValue: mockDeliveryService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryController>(DeliveryController);
    service = module.get<DeliveryService>(DeliveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDeliveryMethodsByCountry', () => {
    it('should return delivery methods for a country', async () => {
      const mockMethods = [
        {
          id: '1',
          name: 'Standard Delivery',
          type: DeliveryType.OWN_DELIVERY,
          baseFee: 2500,
          estimatedDaysMin: 1,
          estimatedDaysMax: 2,
          description: 'Standard delivery',
          isActive: true,
          countryCode: 'ML',
        },
      ];

      mockDeliveryService.getDeliveryMethodsByCountry.mockResolvedValue(mockMethods);

      const result = await controller.getDeliveryMethodsByCountry('ML');

      expect(service.getDeliveryMethodsByCountry).toHaveBeenCalledWith('ML');
      expect(result).toEqual(mockMethods);
    });
  });

  describe('getPickupPointsByCountry', () => {
    it('should return pickup points for a country', async () => {
      const mockPoints = [
        {
          id: '1',
          name: 'Point Relais Plateau',
          address: 'Avenue Chardy, Plateau',
          city: 'Abidjan',
          phone: '+225 20 21 22 23',
          instructions: 'Ouvert du lundi au samedi de 8h à 18h',
          isActive: true,
          countryCode: 'CI',
        },
      ];

      mockDeliveryService.getPickupPointsByCountry.mockResolvedValue(mockPoints);

      const result = await controller.getPickupPointsByCountry('CI');

      expect(service.getPickupPointsByCountry).toHaveBeenCalledWith('CI');
      expect(result).toEqual(mockPoints);
    });
  });

  // Unit tests for country-specific delivery options (Requirements 8.1, 8.2)
  describe('Country-Specific Delivery Options', () => {
    describe('Mali Own Delivery Team (Requirement 8.1)', () => {
      it('should return Mali own delivery methods', async () => {
        const mockMaliMethods = [
          {
            id: '1',
            name: 'Mali Express',
            type: DeliveryType.OWN_DELIVERY,
            baseFee: 2500,
            estimatedDaysMin: 1,
            estimatedDaysMax: 2,
            description: 'Own delivery team for Mali',
            isActive: true,
            countryCode: 'ML',
          },
          {
            id: '2',
            name: 'Mali Same Day',
            type: DeliveryType.OWN_DELIVERY,
            baseFee: 5000,
            estimatedDaysMin: 1,
            estimatedDaysMax: 1,
            description: 'Same day delivery in Bamako',
            isActive: true,
            countryCode: 'ML',
          },
        ];

        mockDeliveryService.getDeliveryMethodsByCountry.mockResolvedValue(mockMaliMethods);

        const result = await controller.getDeliveryMethodsByCountry('ML');

        expect(service.getDeliveryMethodsByCountry).toHaveBeenCalledWith('ML');
        expect(result).toEqual(mockMaliMethods);
        expect(result.every(method => method.type === DeliveryType.OWN_DELIVERY)).toBe(true);
        expect(result.every(method => method.countryCode === 'ML')).toBe(true);
      });

      it('should calculate Mali city-based delivery fees', async () => {
        const calculateDto = {
          countryCode: 'ML',
          deliveryMethodId: '1',
          city: 'Sikasso',
          orderValue: 50000,
        };

        const mockResult = {
          deliveryFee: 3000, // 2500 * 1.2 multiplier for Sikasso
          estimatedDaysMin: 1,
          estimatedDaysMax: 2,
          deliveryMethodName: 'Mali Express',
          freeDeliveryThreshold: 100000,
        };

        mockDeliveryService.calculateDeliveryFee.mockResolvedValue(mockResult);

        const result = await controller.calculateDeliveryFee(calculateDto);

        expect(service.calculateDeliveryFee).toHaveBeenCalledWith(calculateDto);
        expect(result).toEqual(mockResult);
        expect(result.freeDeliveryThreshold).toBe(100000);
      });

      it('should return empty pickup points for Mali (no pickup points for own delivery)', async () => {
        mockDeliveryService.getPickupPointsByCountry.mockResolvedValue([]);

        const result = await controller.getPickupPointsByCountry('ML');

        expect(service.getPickupPointsByCountry).toHaveBeenCalledWith('ML');
        expect(result).toEqual([]);
      });
    });

    describe('CI/BF Partner Logistics (Requirement 8.2)', () => {
      it('should return Côte d\'Ivoire partner logistics methods', async () => {
        const mockCIMethods = [
          {
            id: '3',
            name: 'CI Partner Express',
            type: DeliveryType.PARTNER_LOGISTICS,
            baseFee: 3000,
            estimatedDaysMin: 2,
            estimatedDaysMax: 4,
            description: 'Partner logistics for Côte d\'Ivoire',
            isActive: true,
            countryCode: 'CI',
          },
        ];

        mockDeliveryService.getDeliveryMethodsByCountry.mockResolvedValue(mockCIMethods);

        const result = await controller.getDeliveryMethodsByCountry('CI');

        expect(service.getDeliveryMethodsByCountry).toHaveBeenCalledWith('CI');
        expect(result).toEqual(mockCIMethods);
        expect(result[0].type).toBe(DeliveryType.PARTNER_LOGISTICS);
        expect(result[0].countryCode).toBe('CI');
      });

      it('should return Burkina Faso partner logistics methods', async () => {
        const mockBFMethods = [
          {
            id: '4',
            name: 'BF Partner Standard',
            type: DeliveryType.PARTNER_LOGISTICS,
            baseFee: 2800,
            estimatedDaysMin: 3,
            estimatedDaysMax: 5,
            description: 'Partner logistics for Burkina Faso',
            isActive: true,
            countryCode: 'BF',
          },
        ];

        mockDeliveryService.getDeliveryMethodsByCountry.mockResolvedValue(mockBFMethods);

        const result = await controller.getDeliveryMethodsByCountry('BF');

        expect(service.getDeliveryMethodsByCountry).toHaveBeenCalledWith('BF');
        expect(result).toEqual(mockBFMethods);
        expect(result[0].type).toBe(DeliveryType.PARTNER_LOGISTICS);
        expect(result[0].countryCode).toBe('BF');
      });

      it('should return pickup points for Côte d\'Ivoire', async () => {
        const mockCIPickupPoints = [
          {
            id: '1',
            name: 'Point Relais Plateau',
            address: 'Avenue Chardy, Plateau',
            city: 'Abidjan',
            phone: '+225 20 21 22 23',
            instructions: 'Ouvert du lundi au samedi de 8h à 18h',
            isActive: true,
            countryCode: 'CI',
          },
          {
            id: '2',
            name: 'Point Relais Cocody',
            address: 'Boulevard Lagunaire, Cocody',
            city: 'Abidjan',
            phone: '+225 20 21 22 24',
            instructions: 'Ouvert tous les jours de 9h à 19h',
            isActive: true,
            countryCode: 'CI',
          },
        ];

        mockDeliveryService.getPickupPointsByCountry.mockResolvedValue(mockCIPickupPoints);

        const result = await controller.getPickupPointsByCountry('CI');

        expect(service.getPickupPointsByCountry).toHaveBeenCalledWith('CI');
        expect(result).toEqual(mockCIPickupPoints);
        expect(result).toHaveLength(2);
        expect(result.every(point => point.countryCode === 'CI')).toBe(true);
      });

      it('should return pickup points for Burkina Faso', async () => {
        const mockBFPickupPoints = [
          {
            id: '3',
            name: 'Point Relais Centre',
            address: 'Avenue Kwame Nkrumah',
            city: 'Ouagadougou',
            phone: '+226 25 30 40 50',
            instructions: 'Ouvert du lundi au vendredi de 8h à 17h',
            isActive: true,
            countryCode: 'BF',
          },
        ];

        mockDeliveryService.getPickupPointsByCountry.mockResolvedValue(mockBFPickupPoints);

        const result = await controller.getPickupPointsByCountry('BF');

        expect(service.getPickupPointsByCountry).toHaveBeenCalledWith('BF');
        expect(result).toEqual(mockBFPickupPoints);
        expect(result).toHaveLength(1);
        expect(result[0].countryCode).toBe('BF');
      });

      it('should calculate CI/BF partner logistics fees without city multipliers', async () => {
        const calculateDto = {
          countryCode: 'CI',
          deliveryMethodId: '3',
          city: 'Abidjan',
          orderValue: 50000,
        };

        const mockResult = {
          deliveryFee: 3000, // No city multiplier for partner logistics
          estimatedDaysMin: 2,
          estimatedDaysMax: 4,
          deliveryMethodName: 'CI Partner Express',
          freeDeliveryThreshold: 75000,
        };

        mockDeliveryService.calculateDeliveryFee.mockResolvedValue(mockResult);

        const result = await controller.calculateDeliveryFee(calculateDto);

        expect(service.calculateDeliveryFee).toHaveBeenCalledWith(calculateDto);
        expect(result).toEqual(mockResult);
        expect(result.freeDeliveryThreshold).toBe(75000);
      });

      it('should apply free delivery for CI/BF orders above 75,000 FCFA', async () => {
        const calculateDto = {
          countryCode: 'BF',
          deliveryMethodId: '4',
          city: 'Ouagadougou',
          orderValue: 80000, // Above 75,000 FCFA threshold
        };

        const mockResult = {
          deliveryFee: 0, // Free delivery
          estimatedDaysMin: 3,
          estimatedDaysMax: 5,
          deliveryMethodName: 'BF Partner Standard',
          freeDeliveryThreshold: 75000,
        };

        mockDeliveryService.calculateDeliveryFee.mockResolvedValue(mockResult);

        const result = await controller.calculateDeliveryFee(calculateDto);

        expect(service.calculateDeliveryFee).toHaveBeenCalledWith(calculateDto);
        expect(result).toEqual(mockResult);
        expect(result.deliveryFee).toBe(0);
      });
    });

    describe('Cross-Country Validation', () => {
      it('should handle requests for unsupported countries', async () => {
        mockDeliveryService.getDeliveryMethodsByCountry.mockResolvedValue([]);

        const result = await controller.getDeliveryMethodsByCountry('NG'); // Nigeria - not supported

        expect(service.getDeliveryMethodsByCountry).toHaveBeenCalledWith('NG');
        expect(result).toEqual([]);
      });

      it('should handle pickup point requests for countries without pickup points', async () => {
        mockDeliveryService.getPickupPointsByCountry.mockResolvedValue([]);

        const result = await controller.getPickupPointsByCountry('ML'); // Mali uses own delivery, no pickup points

        expect(service.getPickupPointsByCountry).toHaveBeenCalledWith('ML');
        expect(result).toEqual([]);
      });
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should calculate delivery fee', async () => {
      const calculateDto = {
        countryCode: 'ML',
        deliveryMethodId: '1',
        city: 'Bamako',
        orderValue: 50000,
      };

      const mockResult = {
        deliveryFee: 2500,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        deliveryMethodName: 'Standard Delivery',
        freeDeliveryThreshold: 100000,
      };

      mockDeliveryService.calculateDeliveryFee.mockResolvedValue(mockResult);

      const result = await controller.calculateDeliveryFee(calculateDto);

      expect(service.calculateDeliveryFee).toHaveBeenCalledWith(calculateDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDeliveryTracking', () => {
    it('should return delivery tracking by tracking number', async () => {
      const mockTracking = {
        id: '1',
        trackingNumber: 'TRK123456',
        status: 'in_transit' as const,
        estimatedDeliveryDate: new Date('2024-01-15'),
        carrierName: 'Mali Express',
        orderId: 'order-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDeliveryService.getDeliveryTracking.mockResolvedValue(mockTracking);

      const result = await controller.getDeliveryTracking('TRK123456');

      expect(service.getDeliveryTracking).toHaveBeenCalledWith('TRK123456');
      expect(result).toEqual(mockTracking);
    });
  });
});