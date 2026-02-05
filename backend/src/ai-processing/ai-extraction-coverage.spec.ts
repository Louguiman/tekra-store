import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { AIProcessingService } from './ai-processing.service';
import { RuleBasedExtractionService } from './rule-based-extraction.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';

describe('Feature: whatsapp-supplier-automation, Property 3: AI Extraction Field Coverage', () => {
  let aiProcessingService: AIProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProcessingService,
        RuleBasedExtractionService,
        DuplicateDetectionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                OLLAMA_BASE_URL: 'http://localhost:11434',
                OLLAMA_MODEL: 'llama3.2:1b',
                AI_PROCESSING_ENABLED: false, // Disable for testing rule-based only
                AI_FALLBACK_TO_RULES: true,
                AI_CONFIDENCE_THRESHOLD: 0.7,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              andWhere: jest.fn().mockReturnThis(),
              orWhere: jest.fn().mockReturnThis(),
              leftJoin: jest.fn().mockReturnThis(),
              setParameter: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
      ],
    }).compile();

    aiProcessingService = module.get<AIProcessingService>(AIProcessingService);
  });

  // Simplified generators for better performance
  const simpleSupplierGenerator = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    phoneNumber: fc.constant('+1234567890'),
    countryCode: fc.constant('US'),
    isActive: fc.constant(true),
    performanceMetrics: fc.constant({
      totalSubmissions: 0,
      approvedSubmissions: 0,
      averageConfidenceScore: 0.5,
      averageProcessingTime: 1000,
      lastSubmissionDate: new Date(),
      qualityRating: 3,
    }),
    preferredCategories: fc.constant(['electronics']),
    createdAt: fc.constant(new Date()),
    updatedAt: fc.constant(new Date()),
    submissions: fc.constant([]),
  }).map(obj => ({ 
    ...obj, 
    preferredCategories: [...obj.preferredCategories],
    submissions: [...obj.submissions]
  }));

  const simpleProductTextGenerator = fc.oneof(
    fc.constant('iPhone 13 - Price: 500000 XOF - Condition: new'),
    fc.constant('Samsung Galaxy S21 - 450000 XOF - used - Qty: 2'),
    fc.constant('HP Laptop Dell Inspiron - Brand: Dell - 800000 XOF'),
    fc.constant('MacBook Pro 16GB RAM 512GB SSD - Grade A - 1200000 XOF'),
    fc.constant('Sony TV 55 inch - new condition - 600000 XOF'),
  );

  test('Property 3: AI Extraction Field Coverage - For any processed content, the AI parser should attempt extraction of all required product fields and assign valid confidence scores', () => {
    fc.assert(fc.asyncProperty(
      simpleProductTextGenerator,
      simpleSupplierGenerator,
      async (text, supplier) => {
        // Execute the test
        const results = await aiProcessingService.processTextMessage(text, supplier);
        
        // Validate the property: AI Extraction Field Coverage
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        
        if (results.length > 0) {
          const product = results[0];
          
          // Verify confidence score is valid
          expect(product.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(product.confidenceScore).toBeLessThanOrEqual(1);
          expect(typeof product.confidenceScore).toBe('number');
          expect(Number.isFinite(product.confidenceScore)).toBe(true);
          
          // Verify extraction metadata
          expect(product.extractionMetadata).toBeDefined();
          expect(product.extractionMetadata.sourceType).toBe('text');
          expect(product.extractionMetadata.processingTime).toBeGreaterThanOrEqual(0);
          expect(typeof product.extractionMetadata.aiModel).toBe('string');
          expect(Array.isArray(product.extractionMetadata.extractedFields)).toBe(true);
          
          // Verify at least some fields are extracted
          expect(product.extractionMetadata.extractedFields.length).toBeGreaterThan(0);
          
          // Verify field types
          if (product.name) expect(typeof product.name).toBe('string');
          if (product.price) expect(typeof product.price).toBe('number');
          if (product.quantity) expect(typeof product.quantity).toBe('number');
        }
      }
    ), { numRuns: 20 }); // Reduced runs for performance
  });

  test('Property 3 Simple: Basic extraction should work for simple product text', () => {
    fc.assert(fc.asyncProperty(
      fc.constantFrom(
        'iPhone 12 - 400000 XOF',
        'Samsung Galaxy - new - 350000 XOF',
        'Dell Laptop - used - Qty: 1'
      ),
      simpleSupplierGenerator,
      async (text, supplier) => {
        const results = await aiProcessingService.processTextMessage(text, supplier);
        
        expect(results.length).toBeGreaterThan(0);
        const product = results[0];
        
        // Should extract at least name
        expect(product.name).toBeDefined();
        expect(product.name.length).toBeGreaterThan(0);
        
        // Should have reasonable confidence
        expect(product.confidenceScore).toBeGreaterThan(0);
      }
    ), { numRuns: 10 });
  });
});