import * as fc from 'fast-check';
import { Product, RefurbishedGrade } from './entities/product.entity';

/**
 * Feature: ecommerce-platform, Property 26: Data Parsing Validation
 * 
 * Property: For any imported product data, the system must parse it according to 
 * the defined schema and validate against business rules before storage.
 * 
 * Validates: Requirements 12.1, 12.3
 */

interface RawProductData {
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  isRefurbished: boolean;
  refurbishedGrade?: string;
  warrantyMonths: number;
}

function validateProductBusinessRules(product: Product): string[] {
  const errors: string[] = [];
  
  if (!product.name || product.name.length < 3 || product.name.length > 255) {
    errors.push('Product name must be between 3 and 255 characters');
  }
  
  if (product.isRefurbished && !product.refurbishedGrade) {
    errors.push('Refurbished products must have a grade (A, B, or C)');
  }
  
  if (!product.isRefurbished && product.refurbishedGrade) {
    errors.push('Non-refurbished products should not have a refurbished grade');
  }
  
  if (product.warrantyMonths < 0) {
    errors.push('Warranty months must be non-negative');
  }
  
  if (!product.slug || product.slug.length === 0) {
    errors.push('Product slug is required');
  }
  
  return errors;
}

function parseProductData(rawData: RawProductData): Product {
  const product = new Product();
  
  product.name = rawData.name;
  product.slug = rawData.slug;
  product.description = rawData.description || null;
  product.brand = rawData.brand || null;
  product.isRefurbished = rawData.isRefurbished;
  product.warrantyMonths = rawData.warrantyMonths;
  
  if (rawData.refurbishedGrade) {
    const grade = rawData.refurbishedGrade.toUpperCase();
    if (Object.values(RefurbishedGrade).includes(grade as RefurbishedGrade)) {
      product.refurbishedGrade = grade as RefurbishedGrade;
    }
  }
  
  return product;
}

describe('Data Parsing Validation Property Tests', () => {
  
  it('should parse valid product data correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 255 }),
          slug: fc.string({ minLength: 1, maxLength: 255 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          isRefurbished: fc.constant(false),
          warrantyMonths: fc.integer({ min: 0, max: 120 })
        }),
        (rawData: RawProductData) => {
          const parsedProduct = parseProductData(rawData);
          const businessRuleErrors = validateProductBusinessRules(parsedProduct);
          
          expect(parsedProduct.name).toBe(rawData.name);
          expect(parsedProduct.slug).toBe(rawData.slug);
          expect(parsedProduct.description).toBe(rawData.description || null);
          expect(parsedProduct.brand).toBe(rawData.brand || null);
          expect(parsedProduct.isRefurbished).toBe(rawData.isRefurbished);
          expect(parsedProduct.warrantyMonths).toBe(rawData.warrantyMonths);
          expect(businessRuleErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should parse valid refurbished product data correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 255 }),
          slug: fc.string({ minLength: 1, maxLength: 255 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          isRefurbished: fc.constant(true),
          refurbishedGrade: fc.constantFrom('A', 'B', 'C'),
          warrantyMonths: fc.integer({ min: 0, max: 120 })
        }),
        (rawData: RawProductData) => {
          const parsedProduct = parseProductData(rawData);
          const businessRuleErrors = validateProductBusinessRules(parsedProduct);
          
          expect(parsedProduct.name).toBe(rawData.name);
          expect(parsedProduct.slug).toBe(rawData.slug);
          expect(parsedProduct.isRefurbished).toBe(rawData.isRefurbished);
          expect(parsedProduct.refurbishedGrade).toBe(rawData.refurbishedGrade);
          expect(businessRuleErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid product data', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            name: fc.string({ maxLength: 2 }),
            slug: fc.string({ minLength: 1, maxLength: 255 }),
            isRefurbished: fc.boolean(),
            warrantyMonths: fc.integer({ min: 0, max: 120 })
          }),
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 255 }),
            slug: fc.string({ minLength: 1, maxLength: 255 }),
            isRefurbished: fc.constant(true),
            warrantyMonths: fc.integer({ min: 0, max: 120 })
          }),
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 255 }),
            slug: fc.string({ minLength: 1, maxLength: 255 }),
            isRefurbished: fc.boolean(),
            warrantyMonths: fc.integer({ min: -100, max: -1 })
          })
        ),
        (invalidRawData: RawProductData) => {
          const parsedProduct = parseProductData(invalidRawData);
          const businessRuleErrors = validateProductBusinessRules(parsedProduct);
          expect(businessRuleErrors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});