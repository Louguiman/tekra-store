import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, RefurbishedGrade } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Feature: ecommerce-platform, Property 5: Refurbished Product Grading
 * 
 * Property: For any product marked as refurbished, it must display a valid refurbished grade (A, B, or C).
 * 
 * Validates: Requirements 2.3, 7.3
 */

describe('Refurbished Product Grading Property Tests', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let segmentRepository: Repository<ProductSegmentEntity>;
  let countryRepository: Repository<Country>;
  let productPriceRepository: Repository<ProductPrice>;

  const mockCategory = {
    id: 'category-1',
    name: 'Smartphones',
    slug: 'smartphones'
  };

  const mockSegment = {
    id: 'segment-1',
    name: ProductSegment.REFURBISHED,
    description: 'Refurbished products'
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
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductPrice),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductSpecification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductSegmentEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Country),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    segmentRepository = module.get<Repository<ProductSegmentEntity>>(getRepositoryToken(ProductSegmentEntity));
    countryRepository = module.get<Repository<Country>>(getRepositoryToken(Country));
    productPriceRepository = module.get<Repository<ProductPrice>>(getRepositoryToken(ProductPrice));
  });

  it('should require refurbished grade for any product marked as refurbished during creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 255 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          warrantyMonths: fc.integer({ min: 0, max: 120 }),
          isRefurbished: fc.constant(true), // Always refurbished for this test
          refurbishedGrade: fc.option(fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C), { nil: undefined })
        }),
        async (productData) => {
          const createProductDto: CreateProductDto = {
            ...productData,
            categoryId: mockCategory.id,
            segmentId: mockSegment.id,
            prices: [{
              countryId: mockCountry.id,
              price: 100000
            }]
          };

          // Mock repository responses
          jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory as any);
          jest.spyOn(segmentRepository, 'findOne').mockResolvedValue(mockSegment as any);
          jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as any);

          if (productData.refurbishedGrade) {
            // Should succeed when refurbished grade is provided
            const mockProduct = { 
              id: 'product-1', 
              ...productData, 
              category: mockCategory, 
              segment: mockSegment 
            };
            jest.spyOn(productRepository, 'create').mockReturnValue(mockProduct as any);
            jest.spyOn(productRepository, 'save').mockResolvedValue(mockProduct as any);
            jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
            jest.spyOn(productPriceRepository, 'create').mockReturnValue({} as any);
            jest.spyOn(productPriceRepository, 'save').mockResolvedValue({} as any);

            const result = await service.createProduct(createProductDto);
            expect(result).toBeDefined();
            expect(result.isRefurbished).toBe(true);
            expect(result.refurbishedGrade).toBe(productData.refurbishedGrade);
          } else {
            // Should fail when no refurbished grade is provided for refurbished product
            await expect(service.createProduct(createProductDto))
              .rejects
              .toThrow(BadRequestException);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject refurbished grade for any non-refurbished product during creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 255 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          warrantyMonths: fc.integer({ min: 0, max: 120 }),
          isRefurbished: fc.constant(false), // Always non-refurbished for this test
          refurbishedGrade: fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C)
        }),
        async (productData) => {
          const createProductDto: CreateProductDto = {
            ...productData,
            categoryId: mockCategory.id,
            segmentId: mockSegment.id,
            prices: [{
              countryId: mockCountry.id,
              price: 100000
            }]
          };

          // Mock repository responses
          jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory as any);
          jest.spyOn(segmentRepository, 'findOne').mockResolvedValue(mockSegment as any);
          jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as any);

          // Should fail when refurbished grade is provided for non-refurbished product
          await expect(service.createProduct(createProductDto))
            .rejects
            .toThrow(BadRequestException);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should require refurbished grade for any product being updated to refurbished', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isRefurbished: fc.constant(true),
          refurbishedGrade: fc.option(fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C), { nil: undefined })
        }),
        async (updateData) => {
          const productId = 'existing-product-id';
          const existingProduct = {
            id: productId,
            name: 'Existing Product',
            slug: 'existing-product',
            isRefurbished: false,
            refurbishedGrade: null,
            category: mockCategory,
            segment: mockSegment
          };

          const updateProductDto: UpdateProductDto = updateData;

          // Mock existing product lookup
          jest.spyOn(productRepository, 'findOne').mockResolvedValue(existingProduct as any);

          if (updateData.refurbishedGrade) {
            // Should succeed when refurbished grade is provided
            jest.spyOn(productRepository, 'save').mockResolvedValue({
              ...existingProduct,
              ...updateData
            } as any);

            const result = await service.updateProduct(productId, updateProductDto);
            expect(result).toBeDefined();
          } else {
            // Should fail when no refurbished grade is provided for refurbished product
            await expect(service.updateProduct(productId, updateProductDto))
              .rejects
              .toThrow(BadRequestException);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject refurbished grade when updating product to non-refurbished', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isRefurbished: fc.constant(false),
          refurbishedGrade: fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C)
        }),
        async (updateData) => {
          const productId = 'existing-product-id';
          const existingProduct = {
            id: productId,
            name: 'Existing Product',
            slug: 'existing-product',
            isRefurbished: true,
            refurbishedGrade: RefurbishedGrade.A,
            category: mockCategory,
            segment: mockSegment
          };

          const updateProductDto: UpdateProductDto = updateData;

          // Mock existing product lookup
          jest.spyOn(productRepository, 'findOne').mockResolvedValue(existingProduct as any);

          // Should fail when refurbished grade is provided for non-refurbished product
          await expect(service.updateProduct(productId, updateProductDto))
            .rejects
            .toThrow(BadRequestException);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only allow valid refurbished grades (A, B, C) for refurbished products', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 255 }),
          isRefurbished: fc.constant(true),
          refurbishedGrade: fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C)
        }),
        async (productData) => {
          const createProductDto: CreateProductDto = {
            ...productData,
            categoryId: mockCategory.id,
            segmentId: mockSegment.id,
            prices: [{
              countryId: mockCountry.id,
              price: 100000
            }]
          };

          // Mock repository responses
          jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory as any);
          jest.spyOn(segmentRepository, 'findOne').mockResolvedValue(mockSegment as any);
          jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as any);

          const mockProduct = { 
            id: 'product-1', 
            ...productData, 
            category: mockCategory, 
            segment: mockSegment 
          };
          jest.spyOn(productRepository, 'create').mockReturnValue(mockProduct as any);
          jest.spyOn(productRepository, 'save').mockResolvedValue(mockProduct as any);
          jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
          jest.spyOn(productPriceRepository, 'create').mockReturnValue({} as any);
          jest.spyOn(productPriceRepository, 'save').mockResolvedValue({} as any);

          const result = await service.createProduct(createProductDto);
          
          // Verify that only valid grades are accepted
          expect([RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C]).toContain(result.refurbishedGrade);
          expect(result.isRefurbished).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should successfully assign refurbished grades to existing refurbished products', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C),
        async (newGrade) => {
          const productId = 'refurbished-product-id';
          const existingProduct = {
            id: productId,
            name: 'Refurbished Product',
            slug: 'refurbished-product',
            isRefurbished: true,
            refurbishedGrade: RefurbishedGrade.A, // Start with grade A
            category: mockCategory,
            segment: mockSegment
          };

          // Mock existing product lookup
          jest.spyOn(productRepository, 'findOne')
            .mockResolvedValueOnce(existingProduct as any) // First call for getProductById
            .mockResolvedValueOnce({ // Second call for final return
              ...existingProduct,
              refurbishedGrade: newGrade
            } as any);
          
          jest.spyOn(productRepository, 'save').mockResolvedValue({
            ...existingProduct,
            refurbishedGrade: newGrade
          } as any);

          const result = await service.assignRefurbishedGrade(productId, newGrade);
          
          expect(result.refurbishedGrade).toBe(newGrade);
          expect(result.isRefurbished).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject refurbished grade assignment to non-refurbished products', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(RefurbishedGrade.A, RefurbishedGrade.B, RefurbishedGrade.C),
        async (grade) => {
          const productId = 'non-refurbished-product-id';
          const existingProduct = {
            id: productId,
            name: 'New Product',
            slug: 'new-product',
            isRefurbished: false,
            refurbishedGrade: null,
            category: mockCategory,
            segment: mockSegment
          };

          // Mock existing product lookup
          jest.spyOn(productRepository, 'findOne').mockResolvedValue(existingProduct as any);

          // Should fail when trying to assign refurbished grade to non-refurbished product
          await expect(service.assignRefurbishedGrade(productId, grade))
            .rejects
            .toThrow(BadRequestException);
        }
      ),
      { numRuns: 100 }
    );
  });
});