import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryService } from './delivery.service';
import { DeliveryMethod, DeliveryType } from '../entities/delivery-method.entity';
import { PickupPoint } from '../entities/pickup-point.entity';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { Country } from '../entities/country.entity';
import { Order } from '../entities/order.entity';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let deliveryMethodRepository: Repository<DeliveryMethod>;
  let pickupPointRepository: Repository<PickupPoint>;
  let deliveryTrackingRepository: Repository<DeliveryTracking>;
  let countryRepository: Repository<Country>;
  let orderRepository: Repository<Order>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: getRepositoryToken(DeliveryMethod),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PickupPoint),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DeliveryTracking),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Country),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    deliveryMethodRepository = module.get<Repository<DeliveryMethod>>(
      getRepositoryToken(DeliveryMethod),
    );
    pickupPointRepository = module.get<Repository<PickupPoint>>(
      getRepositoryToken(PickupPoint),
    );
    deliveryTrackingRepository = module.get<Repository<DeliveryTracking>>(
      getRepositoryToken(DeliveryTracking),
    );
    countryRepository = module.get<Repository<Country>>(
      getRepositoryToken(Country),
    );
    orderRepository = module.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
          isActive: true,
          country: { code: 'ML', name: 'Mali' },
        },
      ];

      mockRepository.find.mockResolvedValue(mockMethods);

      const result = await service.getDeliveryMethodsByCountry('ML');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { 
          country: { code: 'ML' },
          isActive: true,
        },
        relations: ['country'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].countryCode).toBe('ML');
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should calculate Mali delivery fee with city multiplier', async () => {
      const mockMethod = {
        id: '1',
        name: 'Mali Standard',
        type: DeliveryType.OWN_DELIVERY,
        baseFee: 2500,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        country: { code: 'ML' },
      };

      mockRepository.findOne.mockResolvedValue(mockMethod);

      const result = await service.calculateDeliveryFee({
        countryCode: 'ML',
        deliveryMethodId: '1',
        city: 'Bamako',
        orderValue: 50000,
      });

      expect(result.deliveryFee).toBe(2500); // Bamako multiplier is 1.0
      expect(result.estimatedDaysMin).toBe(1);
      expect(result.estimatedDaysMax).toBe(2);
    });

    it('should apply free delivery for Mali orders above threshold', async () => {
      const mockMethod = {
        id: '1',
        name: 'Mali Standard',
        type: DeliveryType.OWN_DELIVERY,
        baseFee: 2500,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        country: { code: 'ML' },
      };

      mockRepository.findOne.mockResolvedValue(mockMethod);

      const result = await service.calculateDeliveryFee({
        countryCode: 'ML',
        deliveryMethodId: '1',
        city: 'Bamako',
        orderValue: 150000, // Above 100,000 FCFA threshold
      });

      expect(result.deliveryFee).toBe(0); // Free delivery
    });

    it('should calculate partner logistics fee for CI/BF', async () => {
      const mockMethod = {
        id: '2',
        name: 'CI Partner',
        type: DeliveryType.PARTNER_LOGISTICS,
        baseFee: 3000,
        estimatedDaysMin: 2,
        estimatedDaysMax: 4,
        country: { code: 'CI' },
      };

      mockRepository.findOne.mockResolvedValue(mockMethod);

      const result = await service.calculateDeliveryFee({
        countryCode: 'CI',
        deliveryMethodId: '2',
        city: 'Abidjan',
        orderValue: 50000,
      });

      expect(result.deliveryFee).toBe(3000);
      expect(result.freeDeliveryThreshold).toBe(75000);
    });
  });

  // Unit tests for country-specific delivery options (Requirements 8.1, 8.2)
  describe('Country-Specific Delivery Options', () => {
    describe('Mali Own Delivery Team (Requirement 8.1)', () => {
      it('should return own delivery methods for Mali', async () => {
        const mockMaliMethods = [
          {
            id: '1',
            name: 'Mali Express',
            type: DeliveryType.OWN_DELIVERY,
            baseFee: 2500,
            estimatedDaysMin: 1,
            estimatedDaysMax: 2,
            isActive: true,
            country: { code: 'ML', name: 'Mali' },
          },
          {
            id: '2',
            name: 'Mali Same Day',
            type: DeliveryType.OWN_DELIVERY,
            baseFee: 5000,
            estimatedDaysMin: 1,
            estimatedDaysMax: 1,
            isActive: true,
            country: { code: 'ML', name: 'Mali' },
          },
        ];

        mockRepository.find.mockResolvedValue(mockMaliMethods);

        const result = await service.getDeliveryMethodsByCountry('ML');

        expect(result).toHaveLength(2);
        expect(result.every(method => method.type === DeliveryType.OWN_DELIVERY)).toBe(true);
        expect(result.every(method => method.countryCode === 'ML')).toBe(true);
      });

      it('should calculate city-based fees for Mali cities', async () => {
        const mockMethod = {
          id: '1',
          name: 'Mali Standard',
          type: DeliveryType.OWN_DELIVERY,
          baseFee: 2500,
          estimatedDaysMin: 1,
          estimatedDaysMax: 2,
          country: { code: 'ML' },
        };

        mockRepository.findOne.mockResolvedValue(mockMethod);

        // Test different Mali cities with their multipliers
        const testCases = [
          { city: 'Bamako', expectedFee: 2500 }, // 1.0 multiplier
          { city: 'Sikasso', expectedFee: 3000 }, // 1.2 multiplier
          { city: 'Mopti', expectedFee: 3750 }, // 1.5 multiplier
          { city: 'Ségou', expectedFee: 3250 }, // 1.3 multiplier
          { city: 'Kayes', expectedFee: 3500 }, // 1.4 multiplier
          { city: 'Gao', expectedFee: 4500 }, // 1.8 multiplier
          { city: 'Tombouctou', expectedFee: 5000 }, // 2.0 multiplier
          { city: 'Unknown City', expectedFee: 3750 }, // 1.5 default multiplier
        ];

        for (const testCase of testCases) {
          const result = await service.calculateDeliveryFee({
            countryCode: 'ML',
            deliveryMethodId: '1',
            city: testCase.city,
            orderValue: 50000,
          });

          expect(result.deliveryFee).toBe(testCase.expectedFee);
        }
      });

      it('should apply free delivery for Mali orders above 100,000 FCFA in Bamako only', async () => {
        const mockMethod = {
          id: '1',
          name: 'Mali Standard',
          type: DeliveryType.OWN_DELIVERY,
          baseFee: 2500,
          estimatedDaysMin: 1,
          estimatedDaysMax: 2,
          country: { code: 'ML' },
        };

        mockRepository.findOne.mockResolvedValue(mockMethod);

        // Test free delivery in Bamako
        const bamakoResult = await service.calculateDeliveryFee({
          countryCode: 'ML',
          deliveryMethodId: '1',
          city: 'Bamako',
          orderValue: 150000,
        });
        expect(bamakoResult.deliveryFee).toBe(0);

        // Test that other cities still pay delivery fee even above threshold
        const sikassoResult = await service.calculateDeliveryFee({
          countryCode: 'ML',
          deliveryMethodId: '1',
          city: 'Sikasso',
          orderValue: 150000,
        });
        expect(sikassoResult.deliveryFee).toBe(3000); // Still pays 1.2 * 2500
      });

      it('should return correct free delivery threshold for Mali', async () => {
        const mockMethod = {
          id: '1',
          name: 'Mali Standard',
          type: DeliveryType.OWN_DELIVERY,
          baseFee: 2500,
          estimatedDaysMin: 1,
          estimatedDaysMax: 2,
          country: { code: 'ML' },
        };

        mockRepository.findOne.mockResolvedValue(mockMethod);

        const result = await service.calculateDeliveryFee({
          countryCode: 'ML',
          deliveryMethodId: '1',
          city: 'Bamako',
          orderValue: 50000,
        });

        expect(result.freeDeliveryThreshold).toBe(100000);
      });
    });

    describe('CI/BF Partner Logistics (Requirement 8.2)', () => {
      it('should return partner logistics methods for Côte d\'Ivoire', async () => {
        const mockCIMethods = [
          {
            id: '3',
            name: 'CI Partner Express',
            type: DeliveryType.PARTNER_LOGISTICS,
            baseFee: 3000,
            estimatedDaysMin: 2,
            estimatedDaysMax: 4,
            isActive: true,
            country: { code: 'CI', name: 'Côte d\'Ivoire' },
          },
        ];

        mockRepository.find.mockResolvedValue(mockCIMethods);

        const result = await service.getDeliveryMethodsByCountry('CI');

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(DeliveryType.PARTNER_LOGISTICS);
        expect(result[0].countryCode).toBe('CI');
      });

      it('should return partner logistics methods for Burkina Faso', async () => {
        const mockBFMethods = [
          {
            id: '4',
            name: 'BF Partner Standard',
            type: DeliveryType.PARTNER_LOGISTICS,
            baseFee: 2800,
            estimatedDaysMin: 3,
            estimatedDaysMax: 5,
            isActive: true,
            country: { code: 'BF', name: 'Burkina Faso' },
          },
        ];

        mockRepository.find.mockResolvedValue(mockBFMethods);

        const result = await service.getDeliveryMethodsByCountry('BF');

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(DeliveryType.PARTNER_LOGISTICS);
        expect(result[0].countryCode).toBe('BF');
      });

      it('should return pickup points for CI/BF countries', async () => {
        const mockCIPickupPoints = [
          {
            id: '1',
            name: 'Point Relais Plateau',
            address: 'Avenue Chardy, Plateau',
            city: 'Abidjan',
            phone: '+225 20 21 22 23',
            instructions: 'Ouvert du lundi au samedi de 8h à 18h',
            isActive: true,
            country: { code: 'CI', name: 'Côte d\'Ivoire' },
          },
          {
            id: '2',
            name: 'Point Relais Cocody',
            address: 'Boulevard Lagunaire, Cocody',
            city: 'Abidjan',
            phone: '+225 20 21 22 24',
            instructions: 'Ouvert tous les jours de 9h à 19h',
            isActive: true,
            country: { code: 'CI', name: 'Côte d\'Ivoire' },
          },
        ];

        mockRepository.find.mockResolvedValue(mockCIPickupPoints);

        const result = await service.getPickupPointsByCountry('CI');

        expect(result).toHaveLength(2);
        expect(result.every(point => point.countryCode === 'CI')).toBe(true);
        expect(result[0].name).toBe('Point Relais Plateau');
        expect(result[1].name).toBe('Point Relais Cocody');
      });

      it('should calculate partner logistics fees without city multipliers', async () => {
        const mockCIMethod = {
          id: '3',
          name: 'CI Partner',
          type: DeliveryType.PARTNER_LOGISTICS,
          baseFee: 3000,
          estimatedDaysMin: 2,
          estimatedDaysMax: 4,
          country: { code: 'CI' },
        };

        const mockBFMethod = {
          id: '4',
          name: 'BF Partner',
          type: DeliveryType.PARTNER_LOGISTICS,
          baseFee: 2800,
          estimatedDaysMin: 3,
          estimatedDaysMax: 5,
          country: { code: 'BF' },
        };

        // Test CI
        mockRepository.findOne.mockResolvedValueOnce(mockCIMethod);
        const ciResult = await service.calculateDeliveryFee({
          countryCode: 'CI',
          deliveryMethodId: '3',
          city: 'Abidjan',
          orderValue: 50000,
        });
        expect(ciResult.deliveryFee).toBe(3000); // No city multiplier applied

        // Test BF
        mockRepository.findOne.mockResolvedValueOnce(mockBFMethod);
        const bfResult = await service.calculateDeliveryFee({
          countryCode: 'BF',
          deliveryMethodId: '4',
          city: 'Ouagadougou',
          orderValue: 50000,
        });
        expect(bfResult.deliveryFee).toBe(2800); // No city multiplier applied
      });

      it('should apply free delivery for CI/BF orders above 75,000 FCFA', async () => {
        const mockCIMethod = {
          id: '3',
          name: 'CI Partner',
          type: DeliveryType.PARTNER_LOGISTICS,
          baseFee: 3000,
          estimatedDaysMin: 2,
          estimatedDaysMax: 4,
          country: { code: 'CI' },
        };

        const mockBFMethod = {
          id: '4',
          name: 'BF Partner',
          type: DeliveryType.PARTNER_LOGISTICS,
          baseFee: 2800,
          estimatedDaysMin: 3,
          estimatedDaysMax: 5,
          country: { code: 'BF' },
        };

        // Test CI free delivery
        mockRepository.findOne.mockResolvedValueOnce(mockCIMethod);
        const ciResult = await service.calculateDeliveryFee({
          countryCode: 'CI',
          deliveryMethodId: '3',
          city: 'Abidjan',
          orderValue: 80000, // Above 75,000 FCFA threshold
        });
        expect(ciResult.deliveryFee).toBe(0);

        // Test BF free delivery
        mockRepository.findOne.mockResolvedValueOnce(mockBFMethod);
        const bfResult = await service.calculateDeliveryFee({
          countryCode: 'BF',
          deliveryMethodId: '4',
          city: 'Ouagadougou',
          orderValue: 80000, // Above 75,000 FCFA threshold
        });
        expect(bfResult.deliveryFee).toBe(0);
      });

      it('should return correct free delivery threshold for CI/BF', async () => {
        const mockCIMethod = {
          id: '3',
          name: 'CI Partner',
          type: DeliveryType.PARTNER_LOGISTICS,
          baseFee: 3000,
          estimatedDaysMin: 2,
          estimatedDaysMax: 4,
          country: { code: 'CI' },
        };

        mockRepository.findOne.mockResolvedValue(mockCIMethod);

        const result = await service.calculateDeliveryFee({
          countryCode: 'CI',
          deliveryMethodId: '3',
          city: 'Abidjan',
          orderValue: 50000,
        });

        expect(result.freeDeliveryThreshold).toBe(75000);
      });
    });

    describe('Cross-Country Delivery Validation', () => {
      it('should not return Mali delivery methods for CI/BF countries', async () => {
        const mockMethods = [
          {
            id: '1',
            name: 'Mali Express',
            type: DeliveryType.OWN_DELIVERY,
            baseFee: 2500,
            estimatedDaysMin: 1,
            estimatedDaysMax: 2,
            isActive: true,
            country: { code: 'ML', name: 'Mali' },
          },
        ];

        // Mock empty result for CI country query
        mockRepository.find.mockResolvedValue([]);

        const result = await service.getDeliveryMethodsByCountry('CI');

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { 
            country: { code: 'CI' },
            isActive: true,
          },
          relations: ['country'],
        });
        expect(result).toHaveLength(0);
      });

      it('should not return CI/BF pickup points for Mali', async () => {
        // Mock empty result for Mali pickup points query
        mockRepository.find.mockResolvedValue([]);

        const result = await service.getPickupPointsByCountry('ML');

        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { 
            country: { code: 'ML' },
            isActive: true,
          },
          relations: ['country'],
        });
        expect(result).toHaveLength(0);
      });

      it('should handle delivery method not found for wrong country', async () => {
        // Mock null result when trying to use Mali method for CI
        mockRepository.findOne.mockResolvedValue(null);

        await expect(
          service.calculateDeliveryFee({
            countryCode: 'CI',
            deliveryMethodId: 'mali-method-id',
            city: 'Abidjan',
            orderValue: 50000,
          })
        ).rejects.toThrow('Delivery method not found');
      });
    });
  });
});