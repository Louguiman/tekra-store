import { Test, TestingModule } from '@nestjs/testing';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';
import { CountryConfigDto } from './dto/country.dto';

describe('CountriesController', () => {
  let controller: CountriesController;
  let service: CountriesService;

  const mockCountry: Country = {
    id: '1',
    code: 'ML',
    name: 'Mali',
    currency: 'FCFA',
    createdAt: new Date(),
    updatedAt: new Date(),
    orders: [],
    productPrices: [],
  };

  const mockCountryConfig: CountryConfigDto = {
    code: 'ML',
    deliveryMethods: [
      {
        id: 'mali-bamako-delivery',
        name: 'Livraison Bamako',
        type: 'own_delivery',
        baseFee: 2000,
        feePerKm: 100,
        estimatedDays: 1,
        description: 'Livraison dans Bamako par notre équipe',
      },
    ],
    paymentProviders: [
      {
        id: 'orange-money',
        name: 'Orange Money',
        type: 'mobile_money',
        provider: 'orange',
        isActive: true,
        processingFee: 0,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountriesController],
      providers: [
        {
          provide: CountriesService,
          useValue: {
            findAll: jest.fn(),
            findByCode: jest.fn(),
            getCountryConfig: jest.fn(),
            getProductPricesForCountry: jest.fn(),
            formatCurrency: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CountriesController>(CountriesController);
    service = module.get<CountriesService>(CountriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all countries', async () => {
      const countries = [mockCountry];
      jest.spyOn(service, 'findAll').mockResolvedValue(countries);

      const result = await controller.findAll();

      expect(result).toEqual(countries);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('should return a country by code', async () => {
      jest.spyOn(service, 'findByCode').mockResolvedValue(mockCountry);

      const result = await controller.findByCode('ML');

      expect(result).toEqual(mockCountry);
      expect(service.findByCode).toHaveBeenCalledWith('ML');
    });
  });

  describe('getCountryConfig', () => {
    it('should return country configuration', async () => {
      jest.spyOn(service, 'getCountryConfig').mockResolvedValue(mockCountryConfig);

      const result = await controller.getCountryConfig('ML');

      expect(result).toEqual(mockCountryConfig);
      expect(service.getCountryConfig).toHaveBeenCalledWith('ML');
    });
  });

  describe('getProductPrices', () => {
    it('should return product prices for country', async () => {
      const mockPrices = [];
      jest.spyOn(service, 'getProductPricesForCountry').mockResolvedValue(mockPrices);

      const result = await controller.getProductPrices('ML');

      expect(result).toEqual(mockPrices);
      expect(service.getProductPricesForCountry).toHaveBeenCalledWith('ML', undefined);
    });

    it('should return product prices for country with product IDs', async () => {
      const mockPrices = [];
      jest.spyOn(service, 'getProductPricesForCountry').mockResolvedValue(mockPrices);

      const result = await controller.getProductPrices('ML', 'product1,product2');

      expect(result).toEqual(mockPrices);
      expect(service.getProductPricesForCountry).toHaveBeenCalledWith('ML', ['product1', 'product2']);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency amount', async () => {
      jest.spyOn(service, 'formatCurrency').mockReturnValue('100 000 FCFA');

      const result = await controller.formatCurrency('ML', '100000');

      expect(result).toEqual({ formatted: '100 000 FCFA' });
      expect(service.formatCurrency).toHaveBeenCalledWith(100000, 'ML');
    });

    it('should handle decimal amounts', async () => {
      jest.spyOn(service, 'formatCurrency').mockReturnValue('100 001 FCFA');

      const result = await controller.formatCurrency('ML', '100000.75');

      expect(result).toEqual({ formatted: '100 001 FCFA' });
      expect(service.formatCurrency).toHaveBeenCalledWith(100000.75, 'ML');
    });
  });
});