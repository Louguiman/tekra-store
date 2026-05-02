'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { useGetCountriesQuery, useGetDefaultCountryQuery } from '@/store/api'
import { setAvailableCountries, setSelectedCountry } from '@/store/slices/countrySlice'

export function CountryInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const { selectedCountry } = useAppSelector((state) => state.country)
  
  const { data: countries } = useGetCountriesQuery()
  const { data: defaultCountry } = useGetDefaultCountryQuery()

  useEffect(() => {
    if (countries) {
      dispatch(setAvailableCountries(countries))
    }
  }, [countries, dispatch])

  useEffect(() => {
    // If no country is selected in cookies, and we have a default country from API
    if (!selectedCountry && defaultCountry) {
      dispatch(setSelectedCountry({
        code: defaultCountry.code,
        name: defaultCountry.name,
        currency: defaultCountry.currency,
        flag: getFlagForCountry(defaultCountry.code),
        isDefault: true
      }))
    }
  }, [selectedCountry, defaultCountry, dispatch])

  return <>{children}</>
}

function getFlagForCountry(code: string): string {
  const flags: Record<string, string> = {
    'ML': '🇲🇱',
    'CI': '🇨🇮',
    'BF': '🇧🇫',
    'SN': '🇸🇳',
    'GN': '🇬🇳',
    'NE': '🇳🇪',
    'TG': '🇹🇬',
    'BJ': '🇧🇯',
  }
  return flags[code] || '🏳️'
}
