import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';

/**
 * Feature: ecommerce-platform, Property 4: Product Display Completeness
 * 
 * Property: For any product displayed to customers, it must include images, specifications, and pricing information.
 * 
 * Validates: Requirements 2.2
 */

describe('Product Display Completeness Property Tests', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;

  const mockCategory = {
    id: 'category-1',
    name: 'Smartphones',
    slug: 'smartphones'
  };

  const mockSegment = {
    id: 'segment-1',
    name: ProductSegment.MID_RANGE,
    description: 'Mid-range products'
  };

  const mockCountry = {
    id: 'country-1',
    code: 'ML',
    name: 'Mali',
    currency: 'FCFA'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
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

  it('should ensure any product retrieved by ID has complete display information (images, specifications, pricing)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 3, maxLength: 255 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          isRefurbished: fc.boolean(),
          warrantyMonths: fc.integer({ min: 0, max: 120 }),
          images: fc.array(fc.record({
            id: fc.uuid(),
            url: fc.webUrl(),
            altText: fc.option(fc.string({ maxLength: 255 })),
            isPrimary: fc.boolean(),
            sortOrder: fc.integer({ min: 0, max: 100 })
          }), { minLength: 1, maxLength: 5 }),
          specifications: fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            value: fc.string({ minLength: 1, maxLength: 255 })
          }), { minLength: 1, maxLength: 10 }),
          prices: fc.array(fc.record({
            id: fc.uuid(),
            price: fc.integer({ min: 1000, max: 10000000 }),
            promoPrice: fc.option(fc.integer({ min: 500, max: 5000000 })),
            country: fc.constant(mockCountry)
          }).filter(p => Number.isFinite(p.price) && p.price > 0), { minLength: 1, maxLength: 3 })
        }),
        async (productData) => {
          const mockProduct = {
            ...productData,
            category: mockCategory,
            segment: mockSegment,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Mock the repository to return our test product
          jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);

          const result = await service.getProductById(productData.id);

          // Verify that the product has complete display information
          expect(result).toBeDefined();
          
          // Must have images
          expect(result.images).toBeDefined();
          expect(Array.isArray(result.images)).toBe(true);
          expect(result.images.length).toBeGreaterThan(0);
          
          // Each image must have required display properties
          result.images.forEach(image => {
            expect(image.url).toBeDefined();
            expect(typeof image.url).toBe('string');
            expect(image.url.length).toBeGreaterThan(0);
          });

          // Must have specifications
          expect(result.specifications).toBeDefined();
          expect(Array.isArray(result.specifications)).toBe(true);
          expect(result.specifications.length).toBeGreaterThan(0);
          
          // Each specification must have required display properties
          result.specifications.forEach(spec => {
            expect(spec.name).toBeDefined();
            expect(typeof spec.name).toBe('string');
            expect(spec.name.length).toBeGreaterThan(0);
            expect(spec.value).toBeDefined();
            expect(typeof spec.value).toBe('string');
            expect(spec.value.length).toBeGreaterThan(0);
          });

          // Must have pricing information
          expect(result.prices).toBeDefined();
          expect(Array.isArray(result.prices)).toBe(true);
          expect(result.prices.length).toBeGreaterThan(0);
          
          // Each price must have required display properties
          result.prices.forEach(price => {
            expect(price.price).toBeDefined();
            expect(typeof price.price).toBe('number');
            expect(Number.isFinite(price.price)).toBe(true);
            expect(price.price).toBeGreaterThan(0);
            expect(price.country).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});