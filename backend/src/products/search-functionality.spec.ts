import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProductsService } from './products.service';
import { Product, RefurbishedGrade } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { ProductFiltersDto } from './dto/product-filters.dto';

/**
 * Feature: ecommerce-platform, Property 6: Search Functionality
 * 
 * Property: For any search query, the system should return products that match 
 * the search criteria and are available in the customer's selected country.
 * 
 * Validates: Requirements 2.5
 */

describe('Search Functionality Property Tests', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let mockQueryBuilder: any;

  const mockCountries = [
    { id: '1', code: 'ML', name: 'Mali', currency: 'FCFA' },
    { id: '2', code: 'CI', name: 'Côte d\'Ivoire', currency: 'FCFA' },
    { id: '3', code: 'BF', name: 'Burkina Faso', currency: 'FCFA' }
  ];

  const mockCategories = [
    { id: '1', name: 'Smartphones', slug: 'smartphones' },
    { id: '2', name: 'Laptops', slug: 'laptops' },
    { id: '3', name: 'Gaming', slug: 'gaming' }
  ];

  const mockSegments = [
    { id: '1', name: ProductSegment.PREMIUM, description: 'Premium products' },
    { id: '2', name: ProductSegment.MID_RANGE, description: 'Mid-range products' },
    { id: '3', name: ProductSegment.REFURBISHED, description: 'Refurbished products' }
  ];

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProductPrice),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProductSpecification),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProductSegmentEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Country),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('should apply search filters correctly for any search query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          search: fc.string({ minLength: 1, maxLength: 100 }),
          countryId: fc.constantFrom(...mockCountries.map(c => c.id)),
          page: fc.integer({ min: 1, max: 10 }),
          limit: fc.integer({ min: 1, max: 50 })
        }),
        async (filters: Partial<ProductFiltersDto>) => {
          // Mock the query builder methods
          mockQueryBuilder.getCount.mockResolvedValue(0);
          mockQueryBuilder.getMany.mockResolvedValue([]);

          // Call the service method
          await service.getProducts(filters as ProductFiltersDto);

          // Verify that search filter was applied correctly
          expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
            { search: `%${filters.search}%` }
          );

          // Verify query builder was called with proper joins
          expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
          expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.category', 'category');
          expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.segment', 'segment');
          expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.prices', 'prices');
          expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('prices.country', 'country');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle search queries with various character sets and patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }), // Regular strings
          fc.string({ minLength: 1, maxLength: 20 }), // Any characters
          fc.string({ minLength: 1, maxLength: 30 }), // Common search patterns
          fc.integer({ min: 1, max: 999999 }).map(n => n.toString()) // Numbers as strings
        ),
        async (searchQuery: string) => {
          const filters: ProductFiltersDto = {
            search: searchQuery,
            page: 1,
            limit: 20
          };

          mockQueryBuilder.getCount.mockResolvedValue(0);
          mockQueryBuilder.getMany.mockResolvedValue([]);

          await service.getProducts(filters);

          // Verify search parameter is properly escaped and formatted
          expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
            { search: `%${searchQuery}%` }
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent pagination structure for any search results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          search: fc.string({ minLength: 1, maxLength: 50 }),
          page: fc.integer({ min: 1, max: 5 }),
          limit: fc.integer({ min: 1, max: 20 }),
          totalResults: fc.integer({ min: 0, max: 100 })
        }),
        async ({ search, page, limit, totalResults }) => {
          const filters: ProductFiltersDto = { search, page, limit };
          
          // Mock results based on pagination
          const expectedProducts = Array.from({ length: Math.min(limit, totalResults) }, (_, i) => ({
            id: `product-${i}`,
            name: `Product ${i} containing ${search}`,
            slug: `product-${i}`,
            description: `Description with ${search}`,
            brand: 'Test Brand',
            isRefurbished: false,
            warrantyMonths: 12
          }));

          mockQueryBuilder.getCount.mockResolvedValue(totalResults);
          mockQueryBuilder.getMany.mockResolvedValue(expectedProducts);

          const result = await service.getProducts(filters);

          // Verify pagination structure
          expect(result).toHaveProperty('products');
          expect(result).toHaveProperty('total', totalResults);
          expect(result).toHaveProperty('page', page);
          expect(result).toHaveProperty('limit', limit);
          expect(result).toHaveProperty('totalPages', Math.ceil(totalResults / limit));
          
          // Verify products array length
          expect(result.products).toHaveLength(expectedProducts.length);
          
          // Verify skip and take were called with correct values
          const expectedSkip = (page - 1) * limit;
          expect(mockQueryBuilder.skip).toHaveBeenCalledWith(expectedSkip);
          expect(mockQueryBuilder.take).toHaveBeenCalledWith(limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should combine search with other filters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          search: fc.string({ minLength: 1, maxLength: 50 }),
          categoryIds: fc.array(fc.constantFrom(...mockCategories.map(c => c.id)), { minLength: 1, maxLength: 2 }),
          segmentIds: fc.array(fc.constantFrom(...mockSegments.map(s => s.id)), { minLength: 1, maxLength: 2 }),
          brands: fc.array(fc.constantFrom('Apple', 'Samsung', 'HP', 'Dell'), { minLength: 1, maxLength: 2 }),
          isRefurbished: fc.boolean(),
          countryId: fc.constantFrom(...mockCountries.map(c => c.id)),
          minPrice: fc.integer({ min: 10000, max: 500000 }),
          maxPrice: fc.integer({ min: 500000, max: 2000000 })
        }),
        async (filters) => {
          const filtersDto: ProductFiltersDto = {
            ...filters,
            page: 1,
            limit: 20
          };

          mockQueryBuilder.getCount.mockResolvedValue(0);
          mockQueryBuilder.getMany.mockResolvedValue([]);

          await service.getProducts(filtersDto);

          // Verify search filter is applied
          expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
            { search: `%${filters.search}%` }
          );

          // Verify other filters are also applied
          if (filters.categoryIds?.length > 0) {
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'product.category.id IN (:...categoryIds)',
              { categoryIds: filters.categoryIds }
            );
          }

          if (filters.segmentIds?.length > 0) {
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'product.segment.id IN (:...segmentIds)',
              { segmentIds: filters.segmentIds }
            );
          }

          if (filters.brands?.length > 0) {
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'product.brand IN (:...brands)',
              { brands: filters.brands }
            );
          }

          if (filters.isRefurbished !== undefined) {
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'product.isRefurbished = :isRefurbished',
              { isRefurbished: filters.isRefurbished }
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty search results gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          search: fc.string({ minLength: 1, maxLength: 50 }),
          page: fc.integer({ min: 1, max: 10 }),
          limit: fc.integer({ min: 1, max: 50 })
        }),
        async (filters) => {
          const filtersDto: ProductFiltersDto = {
            ...filters
          };

          // Mock empty results
          mockQueryBuilder.getCount.mockResolvedValue(0);
          mockQueryBuilder.getMany.mockResolvedValue([]);

          const result = await service.getProducts(filtersDto);

          // Verify empty results structure
          expect(result.products).toEqual([]);
          expect(result.total).toBe(0);
          expect(result.totalPages).toBe(0);
          expect(result.page).toBe(filters.page);
          expect(result.limit).toBe(filters.limit);
        }
      ),
      { numRuns: 100 }
    );
  });
});