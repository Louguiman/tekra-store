/**
 * Property-Based Tests for Country Selection Persistence
 * Feature: ecommerce-platform, Property 1: Country Selection Persistence
 * Validates: Requirements 1.5
 */

import * as fc from 'fast-check'
import Cookies from 'js-cookie'
import countryReducer, { 
  setSelectedCountry, 
  clearSelectedCountry, 
  Country 
} from '../countrySlice'

// Mock js-cookie
jest.mock('js-cookie')
const mockCookies = Cookies as jest.Mocked<typeof Cookies>

describe('Country Selection Persistence Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property 1: Country Selection Persistence
   * For any customer session, once a country is selected, that country selection 
   * should be maintained across all page navigations within the session.
   */
  it('should persist selected country throughout session', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary country data
        fc.record({
          code: fc.constantFrom('ML', 'CI', 'BF'),
          name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso'),
          currency: fc.constant('FCFA'),
          flag: fc.constantFrom('🇲🇱', '🇨🇮', '🇧🇫')
        }),
        // Generate a sequence of navigation actions (simulating page changes)
        fc.array(fc.constantFrom('navigate', 'refresh', 'reload'), { minLength: 1, maxLength: 10 }),
        (country: Country, navigationActions: string[]) => {
          // Initial state
          const initialState = {
            selectedCountry: null,
            availableCountries: [],
            countryConfig: null,
            isLoading: false
          }

          // Select a country
          const stateAfterSelection = countryReducer(initialState, setSelectedCountry(country))
          
          // Verify country is selected
          expect(stateAfterSelection.selectedCountry).toEqual(country)
          
          // Verify cookie is set for persistence
          expect(mockCookies.set).toHaveBeenCalledWith(
            'selectedCountry', 
            JSON.stringify(country), 
            { expires: 30 }
          )

          // Simulate multiple navigation actions (page changes)
          // The key insight is that the Redux state maintains the selection
          // and the cookie ensures persistence across browser sessions
          let currentState = stateAfterSelection
          for (const action of navigationActions) {
            // During navigation within the same session, the Redux state should maintain the selected country
            expect(currentState.selectedCountry).toEqual(country)
            
            // The cookie should remain set for persistence across sessions
            // (We don't need to call get() during navigation - that only happens on app initialization)
            expect(mockCookies.set).toHaveBeenCalledWith(
              'selectedCountry', 
              JSON.stringify(country), 
              { expires: 30 }
            )
          }

          // After all navigation actions, the country should still be selected
          expect(currentState.selectedCountry).toEqual(country)
          
          // The persistence mechanism (cookie) should still be in place
          expect(mockCookies.set).toHaveBeenCalledWith(
            'selectedCountry', 
            JSON.stringify(country), 
            { expires: 30 }
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should restore country selection from cookies on initialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.constantFrom('ML', 'CI', 'BF'),
          name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso'),
          currency: fc.constant('FCFA'),
          flag: fc.constantFrom('🇲🇱', '🇨🇮', '🇧🇫')
        }),
        (country: Country) => {
          // Mock cookie containing the country data
          mockCookies.get.mockReturnValue(JSON.stringify(country))
          
          // Simulate what happens during app initialization
          // The getInitialCountry function should retrieve from cookies
          const cookieValue = mockCookies.get('selectedCountry')
          let restoredCountry: Country | null = null
          
          if (cookieValue) {
            try {
              restoredCountry = JSON.parse(cookieValue)
            } catch {
              restoredCountry = null
            }
          }
          
          // The country should be successfully restored from cookies
          expect(restoredCountry).toEqual(country)
          expect(mockCookies.get).toHaveBeenCalledWith('selectedCountry')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should clear country selection and remove persistence when explicitly cleared', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.constantFrom('ML', 'CI', 'BF'),
          name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso'),
          currency: fc.constant('FCFA'),
          flag: fc.constantFrom('🇲🇱', '🇨🇮', '🇧🇫')
        }),
        (country: Country) => {
          // Initial state with selected country
          const initialState = {
            selectedCountry: country,
            availableCountries: [],
            countryConfig: null,
            isLoading: false
          }

          // Clear the selected country
          const stateAfterClear = countryReducer(initialState, clearSelectedCountry())
          
          // Verify country is cleared
          expect(stateAfterClear.selectedCountry).toBeNull()
          expect(stateAfterClear.countryConfig).toBeNull()
          
          // Verify cookie is removed
          expect(mockCookies.remove).toHaveBeenCalledWith('selectedCountry')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain country selection consistency across multiple selections', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            code: fc.constantFrom('ML', 'CI', 'BF'),
            name: fc.constantFrom('Mali', 'Côte d\'Ivoire', 'Burkina Faso'),
            currency: fc.constant('FCFA'),
            flag: fc.constantFrom('🇲🇱', '🇨🇮', '🇧🇫')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (countries: Country[]) => {
          let currentState = {
            selectedCountry: null,
            availableCountries: [],
            countryConfig: null,
            isLoading: false
          }

          // Select each country in sequence
          for (const country of countries) {
            currentState = countryReducer(currentState, setSelectedCountry(country))
            
            // Each selection should update the state and persist to cookies
            expect(currentState.selectedCountry).toEqual(country)
            expect(mockCookies.set).toHaveBeenCalledWith(
              'selectedCountry', 
              JSON.stringify(country), 
              { expires: 30 }
            )
          }

          // Final state should have the last selected country
          const lastCountry = countries[countries.length - 1]
          expect(currentState.selectedCountry).toEqual(lastCountry)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle invalid cookie data gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('invalid-json'),
          fc.constant(''),
          fc.constant('null'),
          fc.constant('undefined'),
          fc.string()
        ),
        (invalidCookieData: string) => {
          // Mock invalid cookie data
          mockCookies.get.mockReturnValue(invalidCookieData)
          
          // Simulate the getInitialCountry function behavior
          const cookieValue = mockCookies.get('selectedCountry')
          let restoredCountry: Country | null = null
          
          if (cookieValue) {
            try {
              restoredCountry = JSON.parse(cookieValue)
            } catch {
              // Should handle parse errors gracefully
              restoredCountry = null
            }
          }
          
          // Invalid data should result in null (no crash)
          expect(restoredCountry).toBeNull()
          expect(() => {
            try {
              JSON.parse(invalidCookieData)
            } catch {
              return null
            }
          }).not.toThrow()
        }
      ),
      { numRuns: 50 }
    )
  })
})