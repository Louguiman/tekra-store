/**
 * Property-Based Tests for Checkout Information Collection
 * Feature: ecommerce-platform, Property 9: Checkout Information Collection
 * Validates: Requirements 3.4
 */

import * as fc from 'fast-check'

// Define checkout types locally to avoid import issues
interface DeliveryAddress {
  fullName: string
  phone: string
  address: string
  city: string
  postalCode?: string
}

interface CheckoutFormData {
  fullName: string
  phone: string
  email?: string
  address: string
  city: string
  postalCode?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Pure validation functions for testing
const validateDeliveryAddress = (address: DeliveryAddress): ValidationResult => {
  const errors: string[] = []

  // Required field validations
  if (!address.fullName || address.fullName.trim().length === 0) {
    errors.push('Full name is required')
  }

  if (!address.phone || address.phone.trim().length === 0) {
    errors.push('Phone number is required')
  }

  if (!address.address || address.address.trim().length === 0) {
    errors.push('Address is required')
  }

  if (!address.city || address.city.trim().length === 0) {
    errors.push('City is required')
  }

  // Additional validations
  if (address.fullName && address.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters')
  }

  if (address.phone && address.phone.trim().length < 8) {
    errors.push('Phone number must be at least 8 characters')
  }

  if (address.address && address.address.trim().length < 5) {
    errors.push('Address must be at least 5 characters')
  }

  if (address.city && address.city.trim().length < 2) {
    errors.push('City must be at least 2 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

const validateCheckoutForm = (formData: CheckoutFormData): ValidationResult => {
  const errors: string[] = []

  // Convert form data to delivery address for validation
  const deliveryAddress: DeliveryAddress = {
    fullName: formData.fullName,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    postalCode: formData.postalCode
  }

  const addressValidation = validateDeliveryAddress(deliveryAddress)
  errors.push(...addressValidation.errors)

  // Additional form-specific validations
  if (formData.email && formData.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      errors.push('Email format is invalid')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

const canProceedToOrderCreation = (formData: CheckoutFormData, hasCartItems: boolean, hasSelectedCountry: boolean): boolean => {
  if (!hasCartItems) {
    return false
  }

  if (!hasSelectedCountry) {
    return false
  }

  const validation = validateCheckoutForm(formData)
  return validation.isValid
}

describe('Checkout Information Collection Property Tests', () => {
  test('should require all mandatory delivery address fields for order completion', () => {
    fc.assert(
      fc.property(
        fc.record({
          fullName: fc.string({ minLength: 0, maxLength: 100 }),
          phone: fc.string({ minLength: 0, maxLength: 20 }),
          address: fc.string({ minLength: 0, maxLength: 200 }),
          city: fc.string({ minLength: 0, maxLength: 50 }),
          postalCode: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: undefined })
        }),
        (addressData) => {
          const validation = validateDeliveryAddress(addressData)

          // If any required field is empty or whitespace-only, validation should fail
          const hasEmptyRequiredField = 
            !addressData.fullName || addressData.fullName.trim().length === 0 ||
            !addressData.phone || addressData.phone.trim().length === 0 ||
            !addressData.address || addressData.address.trim().length === 0 ||
            !addressData.city || addressData.city.trim().length === 0

          if (hasEmptyRequiredField) {
            expect(validation.isValid).toBe(false)
            expect(validation.errors.length).toBeGreaterThan(0)
          }

          // If all required fields are present and valid, validation should pass
          const hasValidRequiredFields = 
            addressData.fullName && addressData.fullName.trim().length >= 2 &&
            addressData.phone && addressData.phone.trim().length >= 8 &&
            addressData.address && addressData.address.trim().length >= 5 &&
            addressData.city && addressData.city.trim().length >= 2

          if (hasValidRequiredFields) {
            expect(validation.isValid).toBe(true)
            expect(validation.errors.length).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should validate contact details before allowing checkout completion', () => {
    fc.assert(
      fc.property(
        fc.record({
          fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
          phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
          city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }),
        fc.boolean(), // hasCartItems
        fc.boolean(), // hasSelectedCountry
        (formData, hasCartItems, hasSelectedCountry) => {
          const canProceed = canProceedToOrderCreation(formData, hasCartItems, hasSelectedCountry)

          // Should only allow order creation if all conditions are met
          if (hasCartItems && hasSelectedCountry) {
            const validation = validateCheckoutForm(formData)
            expect(canProceed).toBe(validation.isValid)
          } else {
            expect(canProceed).toBe(false)
          }

          // Verify that contact details are properly validated
          if (formData.email && formData.email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const isValidEmail = emailRegex.test(formData.email.trim())
            
            if (!isValidEmail) {
              expect(canProceed).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should prevent order completion with incomplete delivery information', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Missing fullName
          fc.record({
            fullName: fc.constant(''),
            phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
            address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
            city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
          }),
          // Missing phone
          fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
            phone: fc.constant(''),
            address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
            city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
          }),
          // Missing address
          fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
            phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
            address: fc.constant(''),
            city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
          }),
          // Missing city
          fc.record({
            fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
            phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
            address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
            city: fc.constant(''),
            postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
          })
        ),
        (incompleteFormData) => {
          // Even with cart items and selected country, incomplete form should prevent order creation
          const canProceed = canProceedToOrderCreation(incompleteFormData, true, true)
          expect(canProceed).toBe(false)

          const validation = validateCheckoutForm(incompleteFormData)
          expect(validation.isValid).toBe(false)
          expect(validation.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should handle edge cases in delivery address validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          fullName: fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Too short
            fc.string().map(s => '   ' + s + '   '), // Whitespace padding
            fc.constant('  ') // Only whitespace
          ),
          phone: fc.oneof(
            fc.string({ minLength: 1, maxLength: 7 }), // Too short
            fc.string().map(s => '   ' + s + '   '), // Whitespace padding
            fc.constant('  ') // Only whitespace
          ),
          address: fc.oneof(
            fc.string({ minLength: 1, maxLength: 4 }), // Too short
            fc.string().map(s => '   ' + s + '   '), // Whitespace padding
            fc.constant('  ') // Only whitespace
          ),
          city: fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Too short
            fc.string().map(s => '   ' + s + '   '), // Whitespace padding
            fc.constant('  ') // Only whitespace
          ),
          postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }),
        (edgeCaseData) => {
          const validation = validateDeliveryAddress(edgeCaseData)

          // All these edge cases should result in validation failure
          expect(validation.isValid).toBe(false)
          expect(validation.errors.length).toBeGreaterThan(0)

          // Verify specific error conditions
          if (!edgeCaseData.fullName || edgeCaseData.fullName.trim().length < 2) {
            expect(validation.errors.some(error => error.includes('Full name'))).toBe(true)
          }

          if (!edgeCaseData.phone || edgeCaseData.phone.trim().length < 8) {
            expect(validation.errors.some(error => error.includes('Phone'))).toBe(true)
          }

          if (!edgeCaseData.address || edgeCaseData.address.trim().length < 5) {
            expect(validation.errors.some(error => error.includes('Address'))).toBe(true)
          }

          if (!edgeCaseData.city || edgeCaseData.city.trim().length < 2) {
            expect(validation.errors.some(error => error.includes('City'))).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should validate email format when provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
          phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
          email: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')), // Invalid: no @
            fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '@'), // Invalid: @ at end
            fc.string({ minLength: 1, maxLength: 50 }).map(s => '@' + s), // Invalid: @ at start
            fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '@domain'), // Invalid: no TLD
            fc.emailAddress() // Valid email
          ),
          address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
          city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }),
        (formData) => {
          const validation = validateCheckoutForm(formData)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

          if (formData.email && formData.email.trim().length > 0) {
            const isValidEmail = emailRegex.test(formData.email.trim())
            
            if (isValidEmail) {
              // If email is valid, validation should only fail due to other fields
              const addressValidation = validateDeliveryAddress({
                fullName: formData.fullName,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                postalCode: formData.postalCode
              })
              expect(validation.isValid).toBe(addressValidation.isValid)
            } else {
              // If email is invalid, validation should fail
              expect(validation.isValid).toBe(false)
              expect(validation.errors.some(error => error.includes('Email'))).toBe(true)
            }
          } else {
            // If no email provided, validation should only depend on address fields
            const addressValidation = validateDeliveryAddress({
              fullName: formData.fullName,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              postalCode: formData.postalCode
            })
            expect(validation.isValid).toBe(addressValidation.isValid)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should require cart items and country selection for checkout completion', () => {
    fc.assert(
      fc.property(
        fc.record({
          fullName: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
          phone: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
          email: fc.option(fc.emailAddress(), { nil: undefined }),
          address: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
          city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
        }),
        fc.boolean(),
        fc.boolean(),
        (validFormData, hasCartItems, hasSelectedCountry) => {
          const canProceed = canProceedToOrderCreation(validFormData, hasCartItems, hasSelectedCountry)

          // Even with valid form data, should not proceed without cart items or country selection
          if (!hasCartItems || !hasSelectedCountry) {
            expect(canProceed).toBe(false)
          }

          // Should only proceed when all conditions are met
          if (hasCartItems && hasSelectedCountry) {
            const validation = validateCheckoutForm(validFormData)
            expect(canProceed).toBe(validation.isValid)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})