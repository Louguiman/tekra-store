'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/backend/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error('Profile fetch error:', error)
        // If token is invalid, redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500"></div>
          <p className="text-dark-600 font-tech">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-gaming font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              {t('profile.title')}
            </span>
          </h1>
          <p className="text-dark-600 font-tech">{t('profile.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-gaming p-6 space-y-4">
              <div className="text-center pb-6 border-b border-dark-200">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-gaming font-bold text-3xl">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <h2 className="text-xl font-gaming font-bold text-dark-800 mb-1">
                  {user?.fullName || 'User'}
                </h2>
                <p className="text-sm text-dark-600 font-tech">
                  {user?.role === 'customer' ? t('profile.customer') : user?.role}
                </p>
              </div>

              <nav className="space-y-2">
                <button className="w-full text-left px-4 py-3 bg-primary-500/10 text-primary-600 font-tech font-semibold rounded-lg border-2 border-primary-500/30">
                  {t('profile.nav.overview')}
                </button>
                <Link 
                  href="/orders"
                  className="block w-full text-left px-4 py-3 text-dark-700 hover:text-primary-500 font-tech font-medium bg-dark-200/30 rounded-lg hover:bg-dark-200/50 transition-all duration-300"
                >
                  {t('profile.nav.orders')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-600 hover:text-red-500 font-tech font-medium bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-300"
                >
                  {t('profile.nav.logout')}
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <div className="card-gaming p-6">
              <h3 className="text-2xl font-gaming font-bold text-dark-800 mb-6">
                {t('profile.info.title')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-tech font-semibold text-dark-600 mb-1">
                    {t('profile.info.fullName')}
                  </label>
                  <p className="text-dark-800 font-tech text-lg">{user?.fullName || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-tech font-semibold text-dark-600 mb-1">
                    {t('profile.info.email')}
                  </label>
                  <p className="text-dark-800 font-tech text-lg">{user?.email || 'Not provided'}</p>
                </div>

                <div>
                  <label className="block text-sm font-tech font-semibold text-dark-600 mb-1">
                    {t('profile.info.phone')}
                  </label>
                  <p className="text-dark-800 font-tech text-lg">{user?.phone || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-tech font-semibold text-dark-600 mb-1">
                    {t('profile.info.country')}
                  </label>
                  <p className="text-dark-800 font-tech text-lg">
                    {user?.countryCode === 'SN' && '🇸🇳 Senegal'}
                    {user?.countryCode === 'CI' && '🇨🇮 Côte d\'Ivoire'}
                    {user?.countryCode === 'ML' && '🇲🇱 Mali'}
                    {!user?.countryCode && 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-tech font-semibold text-dark-600 mb-1">
                    {t('profile.info.memberSince')}
                  </label>
                  <p className="text-dark-800 font-tech text-lg">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-gaming p-6">
              <h3 className="text-2xl font-gaming font-bold text-dark-800 mb-6">
                {t('profile.actions.title')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/orders"
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-dark-50 border-2 border-dark-200 rounded-lg p-4 hover:border-primary-500/50 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-tech font-bold text-dark-800">{t('profile.actions.viewOrders')}</h4>
                        <p className="text-sm text-dark-600 font-tech">{t('profile.actions.viewOrdersDesc')}</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/products"
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-dark-50 border-2 border-dark-200 rounded-lg p-4 hover:border-primary-500/50 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-tech font-bold text-dark-800">{t('profile.actions.continueShopping')}</h4>
                        <p className="text-sm text-dark-600 font-tech">{t('profile.actions.continueShoppingDesc')}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
