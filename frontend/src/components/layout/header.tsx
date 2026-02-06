'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { CountrySelector } from '@/components/country-selector'
import { WhatsAppButton } from '@/components/support/whatsapp-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLanguage } from '@/contexts/LanguageContext'

export function Header() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { totalItems } = useSelector((state: RootState) => state.cart)
  const { selectedCountry } = useSelector((state: RootState) => state.country)
  const { t } = useLanguage()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="relative bg-dark-100/95 backdrop-blur-md border-b border-primary-500/20 shadow-lg">
      {/* Animated border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse"></div>
      
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Gaming Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                <span className="text-white font-gaming font-bold text-xl">W</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-gaming font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                WestTech
              </span>
              <span className="text-xs text-neon-blue font-tech tracking-wider">GAMING</span>
            </div>
          </Link>

          {/* Gaming Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search gaming gear, tech products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-16 py-4 bg-dark-200/50 border border-dark-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-dark-800 placeholder-dark-500 transition-all duration-300 group-hover:bg-dark-200/70"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary-500 hover:text-primary-400 transition-colors duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Gaming Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link href="/products" className="nav-link">
              <span className="font-tech">{t('nav.products')}</span>
            </Link>
            <Link href="/categories" className="nav-link">
              <span className="font-tech">{t('nav.categories')}</span>
            </Link>
            <Link href="/about" className="nav-link">
              <span className="font-tech">About</span>
            </Link>
            <Link href="/support" className="nav-link">
              <span className="font-tech">{t('nav.support')}</span>
            </Link>
          </nav>

          {/* Right side gaming controls */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher - Desktop */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Country Selector - Desktop */}
            <div className="hidden sm:block">
              <CountrySelector />
            </div>

            {/* Gaming Cart */}
            <Link href="/cart" className="relative group">
              <div className="p-3 bg-dark-200/50 rounded-xl border border-dark-300/50 hover:border-primary-500/50 transition-all duration-300 hover:bg-dark-200/70">
                <svg className="w-6 h-6 text-dark-700 group-hover:text-primary-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m-9 0h9" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                    {totalItems}
                  </span>
                )}
              </div>
            </Link>

            {/* Gaming WhatsApp Support */}
            <div className="hidden sm:block">
              <WhatsAppButton 
                variant="inline" 
                size="md"
                className="hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Gaming Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 bg-dark-200/50 rounded-xl border border-dark-300/50 hover:border-primary-500/50 transition-all duration-300 hover:bg-dark-200/70 group"
            >
              <svg className="w-6 h-6 text-dark-700 group-hover:text-primary-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gaming Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-primary-500/20 py-6 animate-slide-up">
            {/* Mobile Gaming Search */}
            <div className="mb-6">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search gaming gear..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-dark-200/50 border border-dark-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-dark-800 placeholder-dark-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </form>
            </div>

            {/* Mobile Language Switcher */}
            <div className="mb-6 sm:hidden">
              <LanguageSwitcher />
            </div>

            {/* Mobile Country Selector */}
            <div className="mb-6 sm:hidden">
              <CountrySelector />
            </div>

            {/* Mobile Gaming Navigation */}
            <nav className="space-y-3">
              <Link 
                href="/products" 
                className="block py-3 px-4 text-dark-700 hover:text-primary-500 font-tech font-medium bg-dark-200/30 rounded-lg hover:bg-dark-200/50 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.products')}
              </Link>
              <Link 
                href="/categories" 
                className="block py-3 px-4 text-dark-700 hover:text-primary-500 font-tech font-medium bg-dark-200/30 rounded-lg hover:bg-dark-200/50 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.categories')}
              </Link>
              <Link 
                href="/about" 
                className="block py-3 px-4 text-dark-700 hover:text-primary-500 font-tech font-medium bg-dark-200/30 rounded-lg hover:bg-dark-200/50 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                href="/support" 
                className="block py-3 px-4 text-dark-700 hover:text-primary-500 font-tech font-medium bg-dark-200/30 rounded-lg hover:bg-dark-200/50 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.support')}
              </Link>
            </nav>

            {/* Mobile WhatsApp */}
            <div className="mt-6 sm:hidden">
              <WhatsAppButton 
                variant="button" 
                size="md"
                className="w-full justify-center"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}