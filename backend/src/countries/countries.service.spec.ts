import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';
import { ProductPrice } from '../entities/product-price.entity';

describe('CountriesService', () => {
  let service: CountriesService;
  let countryRepository: Repository<Country>;
  let productPriceRepository: Repository<ProductPrice>;

  const mockCountry = {
    id: '1',
    code: 'ML',
    name: 'Mali',
    currency: 'FCFA',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCountries = [
    mockCountry,
    {
      id: '2',
      code: 'CI',
      name: 'Côte d\'Ivoire',
      currency: 'FCFA',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      code: 'BF',
      name: 'Burkina Faso',
      currency: 'FCFA',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountriesService,
        {
          provide: getRepositoryToken(Country),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductPrice),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CountriesService>(CountriesService);
    countryRepository = module.get<Repository<Country>>(getRepositoryToken(Country));
    productPriceRepository = module.get<Repository<ProductPrice>>(getRepositoryToken(ProductPrice));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all countries ordered by name', async () => {
      jest.spyOn(countryRepository, 'find').mockResolvedValue(mockCountries as Country[]);

      const result = await service.findAll();

      expect(result).toEqual(mockCountries);
      expect(countryRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });
  });

  describe('findByCode', () => {
    it('should return a country by code', async () => {
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);

      const result = await service.findByCode('ML');

      expect(result).toEqual(mockCountry);
      expect(countryRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'ML' },
      });
    });

    it('should handle lowercase country codes', async () => {
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);

      const result = await service.findByCode('ml');

      expect(result).toEqual(mockCountry);
      expect(countryRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'ML' },
      });
    });

    it('should throw NotFoundException when country not found', async () => {
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findByCode('XX')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('XX')).rejects.toThrow('Country with code XX not found');
    });
  });

  describe('getCountryConfig', () => {
    it('should return country configuration for Mali', async () => {
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);

      const result = await service.getCountryConfig('ML');

      expect(result.code).toBe('ML');
      expect(result.deliveryMethods).toHaveLength(2);
      expect(result.paymentProviders).toHaveLength(5); // Orange, Wave, Moov, Visa, MasterCard
      
      // Check Mali-specific delivery methods
      expect(result.deliveryMethods[0].type).toBe('own_delivery');
      expect(result.deliveryMethods[0].name).toBe('Livraison Bamako');
      
      // Check Moov is included for Mali
      const moovProvider = result.paymentProviders.find(p => p.provider === 'moov');
      expect(moovProvider).toBeDefined();
    });

    it('should return country configuration for Côte d\'Ivoire', async () => {
      const ciCountry = { ...mockCountry, code: 'CI', name: 'Côte d\'Ivoire' };
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(ciCountry as Country);

      const result = await service.getCountryConfig('CI');

      expect(result.code).toBe('CI');
      expect(result.deliveryMethods).toHaveLength(2);
      expect(result.paymentProviders).toHaveLength(4); // Orange, Wave, Visa, MasterCard (no Moov)
      
      // Check CI-specific delivery methods
      expect(result.deliveryMethods[0].type).toBe('partner_logistics');
      expect(result.deliveryMethods[0].name).toBe('Point de Retrait Abidjan');
      
      // Check Moov is not included for CI
      const moovProvider = result.paymentProviders.find(p => p.provider === 'moov');
      expect(moovProvider).toBeUndefined();
    });

    it('should return country configuration for Burkina Faso', async () => {
      const bfCountry = { ...mockCountry, code: 'BF', name: 'Burkina Faso' };
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(bfCountry as Country);

      const result = await service.getCountryConfig('BF');

      expect(result.code).toBe('BF');
      expect(result.deliveryMethods).toHaveLength(2);
      expect(result.paymentProviders).toHaveLength(5); // Orange, Wave, Moov, Visa, MasterCard
      
      // Check BF-specific delivery methods
      expect(result.deliveryMethods[0].type).toBe('partner_logistics');
      expect(result.deliveryMethods[0].name).toBe('Point de Retrait Ouagadougou');
      
      // Check Moov is included for BF
      const moovProvider = result.paymentProviders.find(p => p.provider === 'moov');
      expect(moovProvider).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in FCFA', () => {
      const result = service.formatCurrency(100000, 'ML');
      expect(result).toMatch(/100.000 FCFA/);
    });

    it('should format currency for any supported country', () => {
      expect(service.formatCurrency(50000, 'CI')).toMatch(/50.000 FCFA/);
      expect(service.formatCurrency(75000, 'BF')).toMatch(/75.000 FCFA/);
    });

    it('should handle zero amounts', () => {
      const result = service.formatCurrency(0, 'ML');
      expect(result).toBe('0 FCFA');
    });

    it('should handle decimal amounts by rounding', () => {
      const result = service.formatCurrency(100000.75, 'ML');
      expect(result).toMatch(/100.001 FCFA/);
    });
  });

  describe('getProductPricesForCountry', () => {
    it('should get product prices for a country', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);
      jest.spyOn(productPriceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.getProductPricesForCountry('ML');

      expect(countryRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'ML' },
      });
      expect(productPriceRepository.createQueryBuilder).toHaveBeenCalledWith('price');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('country.id = :countryId', { countryId: '1' });
    });

    it('should filter by product IDs when provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);
      jest.spyOn(productPriceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.getProductPricesForCountry('ML', ['product1', 'product2']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.id IN (:...productIds)', { 
        productIds: ['product1', 'product2'] 
      });
    });
  });
});