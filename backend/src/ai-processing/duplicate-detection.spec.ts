import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { Product } from '../entities/product.entity';
import { ExtractedProduct } from './ai-processing.service';

describe('Feature: whatsapp-supplier-automation, Property 4: Duplicate Detection Accuracy', () => {
  let service: DuplicateDetectionService;
  let productRepository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateDetectionService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            getMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DuplicateDetectionService>(DuplicateDetectionService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  // Property-based test generators
  const extractedProductGenerator = fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    brand: fc.option(fc.constantFrom('Samsung', 'Apple', 'Huawei', 'Xiaomi', 'HP', 'Dell')),
    category: fc.option(fc.constantFrom('smartphones', 'laptops', 'tablets', 'televisions')),
    condition: fc.option(fc.constantFrom('new', 'used', 'refurbished', 'excellent')),
    grade: fc.option(fc.constantFrom('A', 'B', 'C', 'D')),
    price: fc.option(fc.integer({ min: 1000, max: 1000000 })),
    currency: fc.option(fc.constantFrom('XOF', 'EUR', 'USD')),
    quantity: fc.option(fc.integer({ min: 1, max: 100 })),
    specifications: fc.option(fc.record({
      storage: fc.option(fc.string()),
      ram: fc.option(fc.string()),
      color: fc.option(fc.string()),
    })),
    confidenceScore: fc.float({ min: 0, max: 1 }),
    extractionMetadata: fc.record({
      sourceType: fc.constantFrom('text', 'image', 'pdf'),
      processingTime: fc.integer({ min: 0, max: 30000 }),
      aiModel: fc.string(),
      extractedFields: fc.array(fc.string()),
      fallbackUsed: fc.boolean(),
    }),
  });

  const existingProductGenerator = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    brand: fc.option(fc.constantFrom('Samsung', 'Apple', 'Huawei', 'Xiaomi', 'HP', 'Dell')),
    condition: fc.option(fc.constantFrom('new', 'used', 'refurbished', 'excellent')),
    category: fc.option(fc.record({
      id: fc.uuid(),
      name: fc.constantFrom('smartphones', 'laptops', 'tablets', 'televisions'),
    })),
    productPrices: fc.option(fc.array(fc.record({
      id: fc.uuid(),
      price: fc.integer({ min: 1000, max: 1000000 }),
      currency: fc.constantFrom('XOF', 'EUR', 'USD'),
      isActive: fc.boolean(),
    }), { minLength: 1, maxLength: 3 })),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

  test('Property 4: Duplicate Detection Accuracy - For any extracted product that matches existing products, the system should flag duplicates and suggest appropriate actions', () => {
    fc.assert(fc.asyncProperty(
      extractedProductGenerator,
      fc.array(existingProductGenerator, { minLength: 0, maxLength: 10 }),
      async (extractedProduct, existingProducts) => {
        // Setup mocks
        jest.clearAllMocks();

        // Mock query builder for product search
        const mockQueryBuilder = {
          andWhere: jest.fn().mockReturnThis(),
          orWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          setParameter: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(existingProducts),
        };

        (productRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        // Execute duplicate detection
        const duplicates = await service.detectDuplicates(extractedProduct);

        // Validate the property: Duplicate Detection Accuracy
        expect(Array.isArray(duplicates)).toBe(true);
        expect(duplicates.length).toBeLessThanOrEqual(5); // Should limit results

        // Each duplicate match should have required properties
        duplicates.forEach(duplicate => {
          expect(duplicate).toHaveProperty('productId');
          expect(duplicate).toHaveProperty('similarity');
          expect(duplicate).toHaveProperty('suggestedAction');

          // Validate productId
          expect(typeof duplicate.productId).toBe('string');
          expect(duplicate.productId.length).toBeGreaterThan(0);

          // Validate similarity score
          expect(typeof duplicate.similarity).toBe('number');
          expect(duplicate.similarity).toBeGreaterThanOrEqual(0);
          expect(duplicate.similarity).toBeLessThanOrEqual(1);
          expect(Number.isFinite(duplicate.similarity)).toBe(true);

          // Validate suggested action
          expect(['merge', 'update', 'ignore'].includes(duplicate.suggestedAction)).toBe(true);

          // High similarity should suggest merge or update
          if (duplicate.similarity > 0.8) {
            expect(['merge', 'update'].includes(duplicate.suggestedAction)).toBe(true);
          }

          // Low similarity should suggest ignore
          if (duplicate.similarity < 0.4) {
            expect(duplicate.suggestedAction).toBe('ignore');
          }
        });

        // Results should be sorted by similarity (highest first)
        for (let i = 1; i < duplicates.length; i++) {
          expect(duplicates[i].similarity).toBeLessThanOrEqual(duplicates[i - 1].similarity);
        }

        // If no existing products, should return empty array
        if (existingProducts.length === 0) {
          expect(duplicates.length).toBe(0);
        }

        // Verify query builder was called appropriately
        expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
        
        // Should have applied search conditions if product has searchable fields
        if (extractedProduct.name || extractedProduct.brand || extractedProduct.category) {
          expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
        }
      }
    ), { numRuns: 50 }); // Reduced runs for performance
  });

  test('Property 4 Exact Match: Identical products should be detected with high similarity', () => {
    fc.assert(fc.asyncProperty(
      extractedProductGenerator,
      async (extractedProduct) => {
        jest.clearAllMocks();

        // Create an existing product that's identical to the extracted one
        const identicalProduct: any = {
          id: 'identical-product-id',
          name: extractedProduct.name,
          brand: extractedProduct.brand,
          condition: extractedProduct.condition,
          category: extractedProduct.category ? {
            id: 'category-id',
            name: extractedProduct.category,
          } : null,
          productPrices: extractedProduct.price ? [{
            id: 'price-id',
            price: extractedProduct.price,
            currency: extractedProduct.currency || 'XOF',
            isActive: true,
          }] : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mock query builder to return the identical product
        const mockQueryBuilder = {
          andWhere: jest.fn().mockReturnThis(),
          orWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          setParameter: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([identicalProduct]),
        };

        (productRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        const duplicates = await service.detectDuplicates(extractedProduct);

        // Should detect the identical product
        expect(duplicates.length).toBeGreaterThan(0);
        
        if (duplicates.length > 0) {
          const topMatch = duplicates[0];
          
          // Should have high similarity for identical products
          expect(topMatch.similarity).toBeGreaterThan(0.7);
          expect(topMatch.productId).toBe('identical-product-id');
          
          // Should suggest merge or update for high similarity
          expect(['merge', 'update'].includes(topMatch.suggestedAction)).toBe(true);
        }
      }
    ), { numRuns: 30 });
  });

  test('Property 4 Performance: Duplicate detection should complete within reasonable time', () => {
    fc.assert(fc.asyncProperty(
      extractedProductGenerator,
      fc.array(existingProductGenerator, { minLength: 0, maxLength: 20 }),
      async (extractedProduct, existingProducts) => {
        jest.clearAllMocks();

        // Mock query builder
        const mockQueryBuilder = {
          andWhere: jest.fn().mockReturnThis(),
          orWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          setParameter: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(existingProducts),
        };

        (productRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        // Measure processing time
        const startTime = Date.now();
        const duplicates = await service.detectDuplicates(extractedProduct);
        const processingTime = Date.now() - startTime;

        // Should complete within reasonable time (5 seconds)
        expect(processingTime).toBeLessThan(5000);

        // Should still return valid results
        expect(Array.isArray(duplicates)).toBe(true);
        expect(duplicates.length).toBeLessThanOrEqual(5);
      }
    ), { numRuns: 20 });
  });

  test('Property 4 Edge Cases: Should handle edge cases gracefully', () => {
    fc.assert(fc.asyncProperty(
      fc.oneof(
        // Empty/minimal product
        fc.record({
          name: fc.constant(''),
          brand: fc.constant(null),
          category: fc.constant(null),
          condition: fc.constant(null),
          price: fc.constant(null),
          currency: fc.constant(null),
          confidenceScore: fc.float({ min: 0, max: 1 }),
          extractionMetadata: fc.record({
            sourceType: fc.constantFrom('text', 'image', 'pdf'),
            processingTime: fc.integer({ min: 0, max: 30000 }),
            aiModel: fc.string(),
            extractedFields: fc.array(fc.string()),
            fallbackUsed: fc.boolean(),
          }),
        }),
        // Product with very long name
        fc.record({
          name: fc.string({ minLength: 100, maxLength: 200 }),
          brand: fc.option(fc.string()),
          category: fc.option(fc.string()),
          confidenceScore: fc.float({ min: 0, max: 1 }),
          extractionMetadata: fc.record({
            sourceType: fc.constantFrom('text', 'image', 'pdf'),
            processingTime: fc.integer({ min: 0, max: 30000 }),
            aiModel: fc.string(),
            extractedFields: fc.array(fc.string()),
            fallbackUsed: fc.boolean(),
          }),
        }),
        // Product with special characters
        fc.record({
          name: fc.constant('Product with "special" chars & symbols!'),
          brand: fc.constant("Brand's Name"),
          category: fc.constant('category/subcategory'),
          confidenceScore: fc.float({ min: 0, max: 1 }),
          extractionMetadata: fc.record({
            sourceType: fc.constantFrom('text', 'image', 'pdf'),
            processingTime: fc.integer({ min: 0, max: 30000 }),
            aiModel: fc.string(),
            extractedFields: fc.array(fc.string()),
            fallbackUsed: fc.boolean(),
          }),
        })
      ),
      async (edgeCaseProduct) => {
        jest.clearAllMocks();

        // Mock query builder
        const mockQueryBuilder = {
          andWhere: jest.fn().mockReturnThis(),
          orWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          setParameter: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        (productRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        // Should not throw errors for edge cases
        const duplicates = await service.detectDuplicates(edgeCaseProduct as ExtractedProduct);

        // Should return valid array
        expect(Array.isArray(duplicates)).toBe(true);
        expect(duplicates.length).toBeGreaterThanOrEqual(0);

        // Each result should still be valid
        duplicates.forEach(duplicate => {
          expect(typeof duplicate.productId).toBe('string');
          expect(typeof duplicate.similarity).toBe('number');
          expect(Number.isFinite(duplicate.similarity)).toBe(true);
          expect(['merge', 'update', 'ignore'].includes(duplicate.suggestedAction)).toBe(true);
        });
      }
    ), { numRuns: 20 });
  });
});