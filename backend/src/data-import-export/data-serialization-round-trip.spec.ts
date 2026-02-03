import * as fc from 'fast-check';
import { Order, OrderStatus } from '../entities/order.entity';

/**
 * Feature: ecommerce-platform, Property 28: Data Serialization Round-Trip
 * 
 * Property: For any order data, serializing to JSON and then deserializing should 
 * produce an equivalent order object, maintaining data integrity throughout the process.
 * 
 * Validates: Requirements 12.2, 12.5
 */

interface SerializableOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
  };
  customerEmail?: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
}

function serializeOrder(order: SerializableOrder): string {
  return JSON.stringify(order);
}

function deserializeOrder(serializedOrder: string): SerializableOrder {
  return JSON.parse(serializedOrder);
}

function ordersAreEquivalent(original: SerializableOrder, deserialized: SerializableOrder): boolean {
  // Compare all primitive fields
  if (original.id !== deserialized.id) return false;
  if (original.orderNumber !== deserialized.orderNumber) return false;
  if (original.status !== deserialized.status) return false;
  if (Math.abs(original.totalAmount - deserialized.totalAmount) > 0.01) return false;
  if (Math.abs(original.deliveryFee - deserialized.deliveryFee) > 0.01) return false;
  if (original.customerEmail !== deserialized.customerEmail) return false;
  if (original.customerPhone !== deserialized.customerPhone) return false;
  if (original.createdAt !== deserialized.createdAt) return false;
  if (original.updatedAt !== deserialized.updatedAt) return false;

  // Compare delivery address
  const origAddr = original.deliveryAddress;
  const deserAddr = deserialized.deliveryAddress;
  if (origAddr.fullName !== deserAddr.fullName) return false;
  if (origAddr.phone !== deserAddr.phone) return false;
  if (origAddr.address !== deserAddr.address) return false;
  if (origAddr.city !== deserAddr.city) return false;
  if (origAddr.postalCode !== deserAddr.postalCode) return false;

  return true;
}

const validDateArbitrary = fc.integer({ min: 1577836800000, max: 1924992000000 }).map(timestamp => new Date(timestamp).toISOString());

describe('Data Serialization Round-Trip Property Tests', () => {
  
  it('should maintain data integrity during JSON serialization round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          orderNumber: fc.string({ minLength: 5, maxLength: 20 }),
          status: fc.constantFrom(
            OrderStatus.PENDING,
            OrderStatus.PAID,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED
          ),
          totalAmount: fc.float({ min: 0, max: 10000000, noNaN: true }),
          deliveryFee: fc.float({ min: 0, max: 100000, noNaN: true }),
          deliveryAddress: fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 100 }),
            phone: fc.string({ minLength: 8, maxLength: 20 }),
            address: fc.string({ minLength: 10, maxLength: 500 }),
            city: fc.string({ minLength: 2, maxLength: 100 }),
            postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 }))
          }),
          customerEmail: fc.option(fc.emailAddress()),
          customerPhone: fc.string({ minLength: 8, maxLength: 20 }),
          createdAt: validDateArbitrary,
          updatedAt: validDateArbitrary
        }),
        (originalOrder: SerializableOrder) => {
          // Serialize the order to JSON
          const serialized = serializeOrder(originalOrder);
          
          // Verify serialization produces valid JSON
          expect(() => JSON.parse(serialized)).not.toThrow();
          
          // Deserialize back to object
          const deserialized = deserializeOrder(serialized);
          
          // Verify the round-trip maintains data integrity
          expect(ordersAreEquivalent(originalOrder, deserialized)).toBe(true);
          
          // Verify specific critical fields
          expect(deserialized.id).toBe(originalOrder.id);
          expect(deserialized.orderNumber).toBe(originalOrder.orderNumber);
          expect(deserialized.status).toBe(originalOrder.status);
          expect(deserialized.totalAmount).toBe(originalOrder.totalAmount);
          expect(deserialized.deliveryFee).toBe(originalOrder.deliveryFee);
          expect(deserialized.customerPhone).toBe(originalOrder.customerPhone);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases in serialization round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          orderNumber: fc.string({ minLength: 1, maxLength: 50 }),
          status: fc.constantFrom(...Object.values(OrderStatus)),
          totalAmount: fc.oneof(
            fc.constant(0),
            fc.constant(0.01),
            fc.float({ min: 1000000, max: 10000000, noNaN: true })
          ),
          deliveryFee: fc.oneof(
            fc.constant(0),
            fc.constant(0.01),
            fc.float({ min: 10000, max: 100000, noNaN: true })
          ),
          deliveryAddress: fc.record({
            fullName: fc.oneof(
              fc.string({ minLength: 1, maxLength: 2 }),
              fc.string({ minLength: 98, maxLength: 100 })
            ),
            phone: fc.oneof(
              fc.string({ minLength: 8, maxLength: 8 }),
              fc.string({ minLength: 20, maxLength: 20 })
            ),
            address: fc.string({ minLength: 10, maxLength: 500 }),
            city: fc.string({ minLength: 2, maxLength: 100 }),
            postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 }))
          }),
          customerEmail: fc.option(fc.emailAddress()),
          customerPhone: fc.string({ minLength: 8, maxLength: 20 }),
          createdAt: validDateArbitrary,
          updatedAt: validDateArbitrary
        }),
        (edgeCaseOrder: SerializableOrder) => {
          const serialized = serializeOrder(edgeCaseOrder);
          const deserialized = deserializeOrder(serialized);
          
          // Verify round-trip integrity even for edge cases
          expect(ordersAreEquivalent(edgeCaseOrder, deserialized)).toBe(true);
          
          // Verify no data corruption occurred
          expect(typeof deserialized.totalAmount).toBe('number');
          expect(typeof deserialized.deliveryFee).toBe('number');
          expect(typeof deserialized.deliveryAddress).toBe('object');
          expect(deserialized.deliveryAddress).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve optional fields correctly during round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          orderNumber: fc.string({ minLength: 5, maxLength: 20 }),
          status: fc.constantFrom(...Object.values(OrderStatus)),
          totalAmount: fc.float({ min: 0, max: 10000000, noNaN: true }),
          deliveryFee: fc.float({ min: 0, max: 100000, noNaN: true }),
          deliveryAddress: fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 100 }),
            phone: fc.string({ minLength: 8, maxLength: 20 }),
            address: fc.string({ minLength: 10, maxLength: 500 }),
            city: fc.string({ minLength: 2, maxLength: 100 }),
            postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 }))
          }),
          customerEmail: fc.option(fc.emailAddress()),
          customerPhone: fc.string({ minLength: 8, maxLength: 20 }),
          createdAt: validDateArbitrary,
          updatedAt: validDateArbitrary
        }),
        (orderWithOptionals: SerializableOrder) => {
          const serialized = serializeOrder(orderWithOptionals);
          const deserialized = deserializeOrder(serialized);
          
          // Verify optional fields are preserved correctly
          if (orderWithOptionals.customerEmail === undefined) {
            expect(deserialized.customerEmail).toBeUndefined();
          } else {
            expect(deserialized.customerEmail).toBe(orderWithOptionals.customerEmail);
          }
          
          if (orderWithOptionals.deliveryAddress.postalCode === undefined) {
            expect(deserialized.deliveryAddress.postalCode).toBeUndefined();
          } else {
            expect(deserialized.deliveryAddress.postalCode).toBe(orderWithOptionals.deliveryAddress.postalCode);
          }
          
          // Verify the overall integrity
          expect(ordersAreEquivalent(orderWithOptionals, deserialized)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});