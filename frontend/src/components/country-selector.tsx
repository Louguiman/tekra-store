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
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-tech font-semibold bg-dark-200/50 border border-dark-300/50 rounded-xl hover:bg-dark-200/70 hover:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-dark-800 min-w-[200px]"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-3"></div>
            <span className="text-primary-500">LOADING REGIONS...</span>
          </>
        ) : selectedCountry ? (
          <>
            <span className="mr-3 text-xl">{selectedCountry.flag}</span>
            <div className="flex flex-col items-start">
              <span className="font-gaming text-xs text-primary-500 tracking-wider">GAMING REGION</span>
              <span className="font-tech font-semibold">{selectedCountry.name}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-gaming text-xs text-primary-500 tracking-wider mb-1">SELECT</span>
            <span className="font-tech font-semibold">GAMING REGION</span>
          </div>
        )}
        <svg
          className={`ml-3 h-5 w-5 transition-transform duration-300 text-primary-500 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-dark-100/95 backdrop-blur-md border border-dark-300/50 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
          {availableCountries.map((country, index) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country)}
              className="flex items-center w-full px-6 py-4 text-left hover:bg-dark-200/50 transition-all duration-300 group border-b border-dark-300/20 last:border-b-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="mr-4 text-2xl group-hover:scale-110 transition-transform duration-300">{country.flag}</span>
              <div className="flex-1">
                <div className="font-tech font-semibold text-dark-800 group-hover:text-primary-500 transition-colors duration-300">
                  {country.name}
                </div>
                <div className="text-sm text-dark-600 font-tech">
                  <span className="text-secondary-500">Currency:</span> {country.currency}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}