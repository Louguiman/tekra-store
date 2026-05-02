import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import Cookies from 'js-cookie'
import { Country as ApiCountry, CountryConfig } from '../api'

export interface Country {
  code: string
  name: string
  currency: string
  flag: string
  isDefault?: boolean
}

interface CountryState {
  selectedCountry: Country | null
  availableCountries: Country[]
  countryConfig: CountryConfig | null
  isLoading: boolean
}

const defaultCountries: Country[] = [
  { code: 'ML', name: 'Mali', currency: 'FCFA', flag: '🇲🇱' },
  { code: 'CI', name: 'Côte d\'Ivoire', currency: 'FCFA', flag: '🇨🇮' },
  { code: 'BF', name: 'Burkina Faso', currency: 'FCFA', flag: '🇧🇫' },
]

const getInitialCountry = (): Country | null => {
  if (typeof window === 'undefined') return null
  
  const savedCountry = Cookies.get('selectedCountry')
  if (savedCountry) {
    try {
      return JSON.parse(savedCountry)
    } catch {
      return null
    }
  }
  return null
}

const initialState: CountryState = {
  selectedCountry: getInitialCountry(),
  availableCountries: defaultCountries,
  countryConfig: null,
  isLoading: false,
}

const countrySlice = createSlice({
  name: 'country',
  initialState,
  reducers: {
    setSelectedCountry: (state, action: PayloadAction<Country>) => {
      state.selectedCountry = action.payload
      // Save to cookies for persistence
      Cookies.set('selectedCountry', JSON.stringify(action.payload), { expires: 30 })
    },
    clearSelectedCountry: (state) => {
      state.selectedCountry = null
      state.countryConfig = null
      Cookies.remove('selectedCountry')
    },
    setAvailableCountries: (state, action: PayloadAction<ApiCountry[]>) => {
      // Convert API countries to frontend format with flags
      state.availableCountries = action.payload.map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency,
        flag: getFlagForCountry(country.code),
        isDefault: country.isDefault,
      }))
    },
    setCountryConfig: (state, action: PayloadAction<CountryConfig>) => {
      state.countryConfig = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

function getFlagForCountry(code: string): string {
  const flags: Record<string, string> = {
    'ML': '🇲🇱',
    'CI': '🇨🇮',
    'BF': '🇧🇫',
  }
  return flags[code] || '🏳️'
}

export const { 
  setSelectedCountry, 
  clearSelectedCountry, 
  setAvailableCountries, 
  setCountryConfig, 
  setLoading 
} = countrySlice.actions
export default countrySlice.reducer