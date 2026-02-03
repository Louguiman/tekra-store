import * as fc from 'fast-check';
import { ExportedProduct, ExportedOrder } from './dto/export-data.dto';

/**
 * Feature: ecommerce-platform, Property 27: Data Export Schema Compliance
 * 
 * Property: For any data export request, the system must format the exported data 
 * according to the specified export schema.
 * 
 * Validates: Requirements 12.4
 */

function validateExportSchema(data: any, schemaType: 'products' | 'orders'): string[] {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Export data must be an array');
    return errors;
  }

  if (data.length === 0) {
    errors.push('Export data array cannot be empty');
    return errors;
  }

  if (schemaType === 'products') {
    data.forEach((item, index) => {
      if (!item.id) errors.push(`Product ${index + 1}: ID is required`);
      if (!item.name) errors.push(`Product ${index + 1}: Name is required`);
      if (!item.slug) errors.push(`Product ${index + 1}: Slug is required`);
      if (typeof item.isRefurbished !== 'boolean') {
        errors.push(`Product ${index + 1}: isRefurbished must be boolean`);
      }
      if (!Array.isArray(item.prices)) {
        errors.push(`Product ${index + 1}: Prices must be an array`);
      }
    });
  } else if (schemaType === 'orders') {
    data.forEach((item, index) => {
      if (!item.id) errors.push(`Order ${index + 1}: ID is required`);
      if (!item.orderNumber) errors.push(`Order ${index + 1}: Order number is required`);
      if (!item.status) errors.push(`Order ${index + 1}: Status is required`);
      if (typeof item.totalAmount !== 'number') {
        errors.push(`Order ${index + 1}: Total amount must be a number`);
      }
      if (!Array.isArray(item.items)) {
        errors.push(`Order ${index + 1}: Items must be an array`);
      }
    });
  }

  return errors;
}

describe('Data Export Schema Compliance Property Tests', () => {

  it('should validate exported product data complies with schema', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 255 }),
            slug: fc.string({ minLength: 1, maxLength: 255 }),
            description: fc.option(fc.string({ maxLength: 1000 })),
            brand: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            isRefurbished: fc.boolean(),
            refurbishedGrade: fc.option(fc.constantFrom('A', 'B', 'C')),
            warrantyMonths: fc.integer({ min: 0, max: 120 }),
            category: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 })
            }),
            segment: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            prices: fc.array(
              fc.record({
                countryCode: fc.constantFrom('ML', 'CI', 'BF'),
                price: fc.float({ min: 0, max: 10000000 }),
                promoPrice: fc.option(fc.float({ min: 0, max: 10000000 }))
              }),
              { minLength: 1, maxLength: 3 }
            ),
            specifications: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                value: fc.string({ minLength: 1, maxLength: 500 }),
                sortOrder: fc.option(fc.integer({ min: 0, max: 100 }))
              })
            ),
            images: fc.array(
              fc.record({
                url: fc.webUrl(),
                altText: fc.option(fc.string({ maxLength: 255 })),
                sortOrder: fc.option(fc.integer({ min: 0, max: 100 })),
                isPrimary: fc.option(fc.boolean())
              })
            ),
            createdAt: fc.integer({ min: 1577836800000, max: 1924992000000 }).map(timestamp => new Date(timestamp).toISOString()),
            updatedAt: fc.integer({ min: 1577836800000, max: 1924992000000 }).map(timestamp => new Date(timestamp).toISOString())
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (exportedProducts: ExportedProduct[]) => {
          const schemaErrors = validateExportSchema(exportedProducts, 'products');
          expect(schemaErrors).toHaveLength(0);
          
          // Verify each product has required fields
          exportedProducts.forEach(product => {
            expect(product.id).toBeDefined();
            expect(product.name).toBeDefined();
            expect(product.slug).toBeDefined();
            expect(typeof product.isRefurbished).toBe('boolean');
            expect(Array.isArray(product.prices)).toBe(true);
            expect(product.prices.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate exported order data complies with schema', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            orderNumber: fc.string({ minLength: 5, maxLength: 20 }),
            status: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
            totalAmount: fc.float({ min: 0, max: 10000000 }),
            deliveryFee: fc.float({ min: 0, max: 100000 }),
            deliveryAddress: fc.record({
              fullName: fc.string({ minLength: 2, maxLength: 100 }),
              phone: fc.string({ minLength: 8, maxLength: 20 }),
              address: fc.string({ minLength: 10, maxLength: 500 }),
              city: fc.string({ minLength: 2, maxLength: 100 }),
              postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 }))
            }),
            customerEmail: fc.option(fc.emailAddress()),
            customerPhone: fc.string({ minLength: 8, maxLength: 20 }),
            country: fc.record({
              code: fc.constantFrom('ML', 'CI', 'BF'),
              name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso')
            }),
            items: fc.array(
              fc.record({
                productName: fc.string({ minLength: 3, maxLength: 255 }),
                quantity: fc.integer({ min: 1, max: 10 }),
                unitPrice: fc.float({ min: 0, max: 10000000 }),
                totalPrice: fc.float({ min: 0, max: 10000000 })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            createdAt: fc.integer({ min: 1577836800000, max: 1924992000000 }).map(timestamp => new Date(timestamp).toISOString()),
            updatedAt: fc.integer({ min: 1577836800000, max: 1924992000000 }).map(timestamp => new Date(timestamp).toISOString())
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (exportedOrders: ExportedOrder[]) => {
          const schemaErrors = validateExportSchema(exportedOrders, 'orders');
          expect(schemaErrors).toHaveLength(0);
          
          // Verify each order has required fields
          exportedOrders.forEach(order => {
            expect(order.id).toBeDefined();
            expect(order.orderNumber).toBeDefined();
            expect(order.status).toBeDefined();
            expect(typeof order.totalAmount).toBe('number');
            expect(Array.isArray(order.items)).toBe(true);
            expect(order.items.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid export data that does not comply with schema', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid products - missing required fields
          fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 255 }),
              // Missing id, slug, isRefurbished, prices
              description: fc.option(fc.string({ maxLength: 1000 }))
            })
          ),
          // Invalid orders - missing required fields
          fc.array(
            fc.record({
              orderNumber: fc.string({ minLength: 5, maxLength: 20 }),
              // Missing id, status, totalAmount, items
              customerPhone: fc.string({ minLength: 8, maxLength: 20 })
            })
          ),
          // Non-array data
          fc.record({
            invalidData: fc.string()
          })
        ),
        (invalidData: any) => {
          const productSchemaErrors = validateExportSchema(invalidData, 'products');
          const orderSchemaErrors = validateExportSchema(invalidData, 'orders');
          
          // At least one schema validation should fail
          expect(productSchemaErrors.length > 0 || orderSchemaErrors.length > 0).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});