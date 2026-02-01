'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store'
import { setSelectedCountry, setAvailableCountries, setCountryConfig, setLoading, Country } from '@/store/slices/countrySlice'
import { useGetCountriesQuery, useGetCountryConfigQuery } from '@/store/api'

export function CountrySelector() {
  const dispatch = useDispatch()
  const { selectedCountry, availableCountries, isLoading } = useSelector((state: RootState) => state.country)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch countries from API
  const { data: apiCountries, isLoading: countriesLoading } = useGetCountriesQuery()
  
  // Fetch country config when a country is selected
  const { data: countryConfig, isLoading: configLoading } = useGetCountryConfigQuery(
    selectedCountry?.code || '',
    { skip: !selectedCountry }
  )

  // Update available countries when API data is loaded
  useEffect(() => {
    if (apiCountries) {
      dispatch(setAvailableCountries(apiCountries))
    }
  }, [apiCountries, dispatch])

  // Update country config when loaded
  useEffect(() => {
    if (countryConfig) {
      dispatch(setCountryConfig(countryConfig))
    }
  }, [countryConfig, dispatch])

  // Update loading state
  useEffect(() => {
    dispatch(setLoading(countriesLoading || configLoading))
  }, [countriesLoading, configLoading, dispatch])

  const handleCountrySelect = (country: Country) => {
    dispatch(setSelectedCountry(country))
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-white/20 border border-white/30 rounded-lg hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Chargement...
          </>
        ) : selectedCountry ? (
          <>
            <span className="mr-2">{selectedCountry.flag}</span>
            {selectedCountry.name}
          </>
        ) : (
          'Sélectionnez votre pays'
        )}
        <svg
          className={`ml-2 h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isLoading && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          {availableCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country)}
              className="flex items-center w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="mr-3">{country.flag}</span>
              <div>
                <div className="font-medium">{country.name}</div>
                <div className="text-sm text-gray-500">Devise: {country.currency}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}