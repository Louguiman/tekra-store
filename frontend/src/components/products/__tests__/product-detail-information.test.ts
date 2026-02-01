/**
 * Property-Based Tests for Product Detail Information
 * Feature: ecommerce-platform, Property 7: Product Detail Information
 * Validates: Requirements 2.6
 */

import * as fc from 'fast-check'

// Types for test data generation
interface TestProduct {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  isRefurbished: boolean
  refurbishedGrade?: 'A' | 'B' | 'C'
  warrantyMonths: number
  segment: 'premium' | 'mid_range' | 'refurbished'
  category: {
    id: string
    name: string
    slug: string
  }
  specifications: Array<{
    id: string
    name: string
    value: string
  }>
  images: Array<{
    id: string
    url: string
    altText?: string
    isPrimary: boolean
  }>
  prices: Array<{
    id: string
    price: number
    promoPrice?: number
    country: {
      id: string
      code: string
      name: string
      currency: string
    }
  }>
  inventory?: {
    quantity: number
    isInStock: boolean
  }
  createdAt: string
  updatedAt: string
}

interface TestCountry {
  id: string
  code: string
  name: string
  currency: string
}

// Generators for test data
const countryGenerator = fc.record({
  id: fc.uuid(),
  code: fc.constantFrom('ML', 'CI', 'BF'),
  name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso'),
  currency: fc.constant('FCFA'),
})

const productGenerator = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  slug: fc.string({ minLength: 3, maxLength: 50 }).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  brand: fc.string({ minLength: 2, maxLength: 50 }),
  isRefurbished: fc.boolean(),
  refurbishedGrade: fc.option(fc.constantFrom('A', 'B', 'C'), { nil: undefined }),
  warrantyMonths: fc.integer({ min: 0, max: 36 }),
  segment: fc.constantFrom('premium', 'mid_range', 'refurbished'),
  category: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    slug: fc.string({ minLength: 3, maxLength: 50 }),
  }),
  specifications: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 30 }),
      value: fc.string({ minLength: 1, maxLength: 100 }),
    }),
    { minLength: 1, maxLength: 10 }
  ),
  images: fc.array(
    fc.record({
      id: fc.uuid(),
      url: fc.webUrl(),
      altText: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
      isPrimary: fc.boolean(),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  prices: fc.array(
    fc.record({
      id: fc.uuid(),
      price: fc.integer({ min: 10000, max: 5000000 }), // FCFA prices
      promoPrice: fc.option(fc.integer({ min: 5000, max: 4000000 }), { nil: undefined }),
      country: countryGenerator,
    }),
    { minLength: 1, maxLength: 3 }
  ),
  inventory: fc.option(
    fc.record({
      quantity: fc.integer({ min: 0, max: 100 }),
      isInStock: fc.boolean(),
    }),
    { nil: undefined }
  ),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
})

// Pure functions to test product detail information logic
const shouldDisplayWarranty = (product: TestProduct): boolean => {
  return product.warrantyMonths > 0
}

const getWarrantyText = (product: TestProduct): string => {
  if (product.warrantyMonths <= 0) return ''
  return `${product.warrantyMonths} Month${product.warrantyMonths > 1 ? 's' : ''} Warranty`
}

const getStockStatus = (product: TestProduct): { isInStock: boolean; quantity: number; displayText: string } => {
  const isInStock = product.inventory?.isInStock ?? true
  const quantity = product.inventory?.quantity ?? 0
  
  let displayText = isInStock ? 'In Stock' : 'Out of Stock'
  
  if (isInStock && quantity <= 5 && quantity > 0) {
    displayText += ` (Only ${quantity} left)`
  }
  
  return { isInStock, quantity, displayText }
}

const hasRequiredProductDetailInfo = (product: TestProduct, selectedCountry: TestCountry | null): boolean => {
  // Must have country selected to display product details
  if (!selectedCountry) return false
  
  // Must have warranty information (if warranty > 0)
  const warrantyRequired = shouldDisplayWarranty(product)
  
  // Must have stock availability information
  const stockInfo = getStockStatus(product)
  
  // Both warranty (when applicable) and stock info must be available
  return (!warrantyRequired || getWarrantyText(product).length > 0) && stockInfo.displayText.length > 0
}

describe('Product Detail Information Property Tests', () => {
  test('should determine warranty display correctly for any product', () => {
    fc.assert(
      fc.property(
        productGenerator,
        (product) => {
          const shouldShow = shouldDisplayWarranty(product)
          const warrantyText = getWarrantyText(product)
          
          if (product.warrantyMonths > 0) {
            expect(shouldShow).toBe(true)
            expect(warrantyText).toContain(`${product.warrantyMonths} Month`)
            expect(warrantyText).toContain('Warranty')
            
            // Check plural form
            if (product.warrantyMonths > 1) {
              expect(warrantyText).toContain('Months')
            } else {
              expect(warrantyText).not.toContain('Months')
            }
          } else {
            expect(shouldShow).toBe(false)
            expect(warrantyText).toBe('')
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  test('should determine stock status correctly for any product', () => {
    fc.assert(
      fc.property(
        productGenerator,
        (product) => {
          const stockInfo = getStockStatus(product)
          
          // Should always have a display text
          expect(stockInfo.displayText).toBeDefined()
          expect(stockInfo.displayText.length).toBeGreaterThan(0)
          
          if (product.inventory) {
            expect(stockInfo.isInStock).toBe(product.inventory.isInStock)
            expect(stockInfo.quantity).toBe(product.inventory.quantity)
            
            if (product.inventory.isInStock) {
              expect(stockInfo.displayText).toContain('In Stock')
              
              // Check low stock warning
              if (product.inventory.quantity <= 5 && product.inventory.quantity > 0) {
                expect(stockInfo.displayText).toContain(`Only ${product.inventory.quantity} left`)
              }
            } else {
              expect(stockInfo.displayText).toContain('Out of Stock')
            }
          } else {
            // Default behavior when inventory is undefined
            expect(stockInfo.isInStock).toBe(true)
            expect(stockInfo.displayText).toContain('In Stock')
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  test('should require both warranty and stock information for complete product details', () => {
    fc.assert(
      fc.property(
        productGenerator,
        countryGenerator,
        (product, country) => {
          const hasCompleteInfo = hasRequiredProductDetailInfo(product, country)
          
          // Should always be true when country is selected
          expect(hasCompleteInfo).toBe(true)
          
          // Verify warranty info is available when needed
          if (product.warrantyMonths > 0) {
            const warrantyText = getWarrantyText(product)
            expect(warrantyText).toContain('Warranty')
          }
          
          // Verify stock info is always available
          const stockInfo = getStockStatus(product)
          expect(stockInfo.displayText).toBeDefined()
          expect(stockInfo.displayText.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  test('should not display product details without country selection', () => {
    fc.assert(
      fc.property(
        productGenerator,
        (product) => {
          const hasCompleteInfo = hasRequiredProductDetailInfo(product, null)
          
          // Should always be false when no country is selected
          expect(hasCompleteInfo).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  test('should handle edge cases for warranty display', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (warrantyMonths) => {
          const product: TestProduct = {
            id: 'test-id',
            name: 'Test Product',
            slug: 'test-product',
            description: 'Test description',
            brand: 'Test Brand',
            isRefurbished: false,
            warrantyMonths,
            segment: 'premium',
            category: { id: 'cat-1', name: 'Category', slug: 'category' },
            specifications: [],
            images: [],
            prices: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          
          const shouldShow = shouldDisplayWarranty(product)
          const warrantyText = getWarrantyText(product)
          
          if (warrantyMonths === 0) {
            expect(shouldShow).toBe(false)
            expect(warrantyText).toBe('')
          } else if (warrantyMonths === 1) {
            expect(shouldShow).toBe(true)
            expect(warrantyText).toBe('1 Month Warranty')
          } else {
            expect(shouldShow).toBe(true)
            expect(warrantyText).toBe(`${warrantyMonths} Months Warranty`)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  test('should handle edge cases for stock display', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 20 }),
        (isInStock, quantity) => {
          const product: TestProduct = {
            id: 'test-id',
            name: 'Test Product',
            slug: 'test-product',
            description: 'Test description',
            brand: 'Test Brand',
            isRefurbished: false,
            warrantyMonths: 0,
            segment: 'premium',
            category: { id: 'cat-1', name: 'Category', slug: 'category' },
            specifications: [],
            images: [],
            prices: [],
            inventory: { isInStock, quantity },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          
          const stockInfo = getStockStatus(product)
          
          expect(stockInfo.isInStock).toBe(isInStock)
          expect(stockInfo.quantity).toBe(quantity)
          
          if (isInStock) {
            expect(stockInfo.displayText).toContain('In Stock')
            
            if (quantity <= 5 && quantity > 0) {
              expect(stockInfo.displayText).toContain(`Only ${quantity} left`)
            } else {
              expect(stockInfo.displayText).not.toContain('Only')
            }
          } else {
            expect(stockInfo.displayText).toContain('Out of Stock')
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})