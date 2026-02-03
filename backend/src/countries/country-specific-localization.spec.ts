/**
 * Property-Based Tests for Country-Specific Localization
 * Feature: ecommerce-platform, Property 2: Country-Specific Localization
 * Validates: Requirements 1.2, 1.3, 1.4
 */

import * as fc from 'fast-check'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CountriesService } from './countries.service'
import { Country } from '../entities/country.entity'
import { ProductPrice } from '../entities/product-price.entity'

describe('Country-Specific Localization Property Tests', () => {
  let service: CountriesService
  let countryRepository: Repository<Country>
  let productPriceRepository: Repository<ProductPrice>

  const supportedCountries = [
    { id: '1', code: 'ML', name: 'Mali', currency: 'FCFA' },
    { id: '2', code: 'CI', name: 'Côte d\'Ivoire', currency: 'FCFA' },
    { id: '3', code: 'BF', name: 'Burkina Faso', currency: 'FCFA' },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountriesService,
        {
          provide: getRepositoryToken(Country),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductPrice),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<CountriesService>(CountriesService)
    countryRepository = module.get<Repository<Country>>(getRepositoryToken(Country))
    productPriceRepository = module.get<Repository<ProductPrice>>(getRepositoryToken(ProductPrice))
  })

  /**
   * Property 2: Country-Specific Localization
   * For any selected country, all prices should be displayed in FCFA, delivery options 
   * should match the country's available methods, and payment providers should be 
   * limited to those supported in that region.
   */
  it('should provide FCFA currency formatting for any supported country', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary country codes from supported countries
        fc.constantFrom('ML', 'CI', 'BF'),
        // Generate arbitrary amounts to format
        fc.integer({ min: 0, max: 10000000 }),
        (countryCode: string, amount: number) => {
          // Format currency for the country
          const formattedCurrency = service.formatCurrency(amount, countryCode)
          
          // All supported countries should use FCFA
          expect(formattedCurrency).toMatch(/FCFA$/)
          
          // Should contain the amount in proper format
          if (amount === 0) {
            expect(formattedCurrency).toBe('0 FCFA')
          } else {
            expect(formattedCurrency).toContain(amount.toLocaleString('fr-FR'))
            expect(formattedCurrency).toMatch(/^\d{1,3}(?:\s\d{3})*\s+FCFA$/)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should provide country-specific delivery methods for any supported country', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ML', 'CI', 'BF'),
        async (countryCode: string) => {
          // Mock the country lookup
          const mockCountry = supportedCountries.find(c => c.code === countryCode)!
          jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country)

          // Get country configuration
          const config = await service.getCountryConfig(countryCode)
          
          // Verify delivery methods are country-specific
          expect(config.deliveryMethods).toBeDefined()
          expect(config.deliveryMethods.length).toBeGreaterThan(0)
          
          if (countryCode === 'ML') {
            // Mali should have own delivery team
            expect(config.deliveryMethods.every(method => method.type === 'own_delivery')).toBe(true)
            expect(config.deliveryMethods.some(method => method.name.includes('Bamako'))).toBe(true)
            expect(config.deliveryMethods.some(method => method.name.includes('Régions'))).toBe(true)
          } else if (countryCode === 'CI') {
            // Côte d'Ivoire should have partner logistics
            expect(config.deliveryMethods.every(method => method.type === 'partner_logistics')).toBe(true)
            expect(config.deliveryMethods.some(method => method.name.includes('Abidjan'))).toBe(true)
          } else if (countryCode === 'BF') {
            // Burkina Faso should have partner logistics
            expect(config.deliveryMethods.every(method => method.type === 'partner_logistics')).toBe(true)
            expect(config.deliveryMethods.some(method => method.name.includes('Ouagadougou'))).toBe(true)
          }
          
          // All delivery methods should have required properties
          config.deliveryMethods.forEach(method => {
            expect(method.id).toBeDefined()
            expect(method.name).toBeDefined()
            expect(method.type).toMatch(/^(own_delivery|partner_logistics)$/)
            expect(method.baseFee).toBeGreaterThanOrEqual(0)
            expect(method.estimatedDays).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should provide country-specific payment providers for any supported country', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ML', 'CI', 'BF'),
        async (countryCode: string) => {
          // Mock the country lookup
          const mockCountry = supportedCountries.find(c => c.code === countryCode)!
          jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country)

          // Get country configuration
          const config = await service.getCountryConfig(countryCode)
          
          // Verify payment providers are country-specific
          expect(config.paymentProviders).toBeDefined()
          expect(config.paymentProviders.length).toBeGreaterThan(0)
          
          // All countries should have Orange Money, Wave, Visa, and MasterCard
          const providerNames = config.paymentProviders.map(p => p.provider)
          expect(providerNames).toContain('orange')
          expect(providerNames).toContain('wave')
          expect(providerNames).toContain('visa')
          expect(providerNames).toContain('mastercard')
          
          // Mali and Burkina Faso should have Moov, Côte d'Ivoire should not
          if (countryCode === 'ML' || countryCode === 'BF') {
            expect(providerNames).toContain('moov')
            expect(config.paymentProviders).toHaveLength(5)
          } else if (countryCode === 'CI') {
            expect(providerNames).not.toContain('moov')
            expect(config.paymentProviders).toHaveLength(4)
          }
          
          // All payment providers should have required properties
          config.paymentProviders.forEach(provider => {
            expect(provider.id).toBeDefined()
            expect(provider.name).toBeDefined()
            expect(provider.type).toMatch(/^(mobile_money|card)$/)
            expect(provider.provider).toMatch(/^(orange|wave|moov|visa|mastercard)$/)
            expect(provider.isActive).toBe(true)
            expect(provider.processingFee).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain consistent localization across multiple country switches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('ML', 'CI', 'BF'), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 1000, max: 100000 }),
        async (countryCodes: string[], testAmount: number) => {
          const results: Array<{
            country: string
            currency: string
            deliveryCount: number
            paymentCount: number
            hasMoov: boolean
          }> = []

          // Test each country in sequence
          for (const countryCode of countryCodes) {
            const mockCountry = supportedCountries.find(c => c.code === countryCode)!
            jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country)

            const config = await service.getCountryConfig(countryCode)
            const formattedCurrency = service.formatCurrency(testAmount, countryCode)
            
            results.push({
              country: countryCode,
              currency: formattedCurrency,
              deliveryCount: config.deliveryMethods.length,
              paymentCount: config.paymentProviders.length,
              hasMoov: config.paymentProviders.some(p => p.provider === 'moov')
            })
          }

          // Verify consistency rules across all countries
          results.forEach(result => {
            // All should use FCFA
            expect(result.currency).toMatch(/FCFA$/)
            
            // All should have delivery methods
            expect(result.deliveryCount).toBeGreaterThan(0)
            
            // Payment provider count should be consistent per country
            if (result.country === 'ML' || result.country === 'BF') {
              expect(result.paymentCount).toBe(5)
              expect(result.hasMoov).toBe(true)
            } else if (result.country === 'CI') {
              expect(result.paymentCount).toBe(4)
              expect(result.hasMoov).toBe(false)
            }
          })

          // Verify that switching countries produces different configurations where expected
          const uniqueCountries = [...new Set(countryCodes)]
          if (uniqueCountries.length > 1) {
            const maliResults = results.filter(r => r.country === 'ML')
            const ciResults = results.filter(r => r.country === 'CI')
            const bfResults = results.filter(r => r.country === 'BF')

            // Mali and BF should have Moov, CI should not
            if (maliResults.length > 0 && ciResults.length > 0) {
              expect(maliResults[0].hasMoov).toBe(true)
              expect(ciResults[0].hasMoov).toBe(false)
            }
            
            if (bfResults.length > 0 && ciResults.length > 0) {
              expect(bfResults[0].hasMoov).toBe(true)
              expect(ciResults[0].hasMoov).toBe(false)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle edge cases in currency formatting consistently across countries', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ML', 'CI', 'BF'),
        fc.oneof(
          fc.constant(0),
          fc.constant(1),
          fc.constant(999),
          fc.constant(1000),
          fc.constant(1000000),
          fc.float({ min: Math.fround(0.1), max: Math.fround(999.9) }),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-100)
        ),
        (countryCode: string, amount: number) => {
          const formattedCurrency = service.formatCurrency(amount, countryCode)
          
          // All results should end with FCFA
          expect(formattedCurrency).toMatch(/FCFA$/)
          
          // Handle edge cases consistently
          if (isNaN(amount)) {
            expect(formattedCurrency).toBe('NaN FCFA')
          } else if (amount < 0 || !isFinite(amount)) {
            // Negative numbers and Infinity get formatted as-is by Intl.NumberFormat
            expect(formattedCurrency).toMatch(/FCFA$/)
          } else if (amount === 0) {
            expect(formattedCurrency).toBe('0 FCFA')
          } else {
            // Should contain properly formatted number
            expect(formattedCurrency).toMatch(/^\d{1,3}(?:\s\d{3})*\s+FCFA$/)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should provide valid delivery and payment configurations for any country combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.constantFrom('ML', 'CI', 'BF'), { minLength: 1, maxLength: 3 }),
        async (countryCodes: string[]) => {
          const configurations = new Map()

          // Get configuration for each country
          for (const countryCode of countryCodes) {
            const mockCountry = supportedCountries.find(c => c.code === countryCode)!
            jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country)

            const config = await service.getCountryConfig(countryCode)
            configurations.set(countryCode, config)
          }

          // Verify each configuration is valid and country-specific
          configurations.forEach((config, countryCode) => {
            // Delivery methods should be appropriate for country
            if (countryCode === 'ML') {
              expect(config.deliveryMethods.every((m: any) => m.type === 'own_delivery')).toBe(true)
            } else {
              expect(config.deliveryMethods.every((m: any) => m.type === 'partner_logistics')).toBe(true)
            }

            // Payment providers should be appropriate for country
            const hasOrange = config.paymentProviders.some((p: any) => p.provider === 'orange')
            const hasWave = config.paymentProviders.some((p: any) => p.provider === 'wave')
            const hasVisa = config.paymentProviders.some((p: any) => p.provider === 'visa')
            const hasMastercard = config.paymentProviders.some((p: any) => p.provider === 'mastercard')
            const hasMoov = config.paymentProviders.some((p: any) => p.provider === 'moov')

            expect(hasOrange).toBe(true)
            expect(hasWave).toBe(true)
            expect(hasVisa).toBe(true)
            expect(hasMastercard).toBe(true)

            if (countryCode === 'ML' || countryCode === 'BF') {
              expect(hasMoov).toBe(true)
            } else {
              expect(hasMoov).toBe(false)
            }
          })

          // If multiple countries, verify they have different configurations where expected
          if (configurations.size > 1) {
            const configs = Array.from(configurations.entries())
            
            // Compare Mali vs CI/BF delivery types
            const maliConfig = configurations.get('ML')
            const ciConfig = configurations.get('CI')
            const bfConfig = configurations.get('BF')

            if (maliConfig && (ciConfig || bfConfig)) {
              const otherConfig = ciConfig || bfConfig
              expect(maliConfig.deliveryMethods[0].type).toBe('own_delivery')
              expect(otherConfig.deliveryMethods[0].type).toBe('partner_logistics')
            }

            // Compare payment providers between CI and ML/BF
            if (ciConfig && (maliConfig || bfConfig)) {
              const moovCountryConfig = maliConfig || bfConfig
              const ciMoov = ciConfig.paymentProviders.some((p: any) => p.provider === 'moov')
              const otherMoov = moovCountryConfig.paymentProviders.some((p: any) => p.provider === 'moov')
              
              expect(ciMoov).toBe(false)
              expect(otherMoov).toBe(true)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})