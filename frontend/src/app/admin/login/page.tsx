'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store'
import { loginStart, loginSuccess, loginFailure, clearError } from '@/store/slices/adminAuthSlice'
import { useAdminLoginMutation } from '@/store/api'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminLoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.adminAuth)
  const [adminLogin] = useAdminLoginMutation()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    loginType: 'email' as 'email' | 'phone'
  })

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/admin')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    // Clear any existing errors when component mounts
    dispatch(clearError())
  }, [dispatch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(loginStart())

    try {
      const loginData = {
        password: formData.password,
        ...(formData.loginType === 'email' 
          ? { email: formData.email }
          : { phone: formData.phone }
        )
      }

      const result = await adminLogin(loginData).unwrap()
      
      dispatch(loginSuccess({
        user: result.user,
        token: result.accessToken,
        refreshToken: result.refreshToken
      }))
      
      router.push('/admin')
    } catch (err: any) {
      dispatch(loginFailure(err?.data?.message || 'Login failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Gaming Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200"></div>
      
      {/* Floating gaming elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-secondary-500/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-accent-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="card-gaming p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-gaming font-bold mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                {t('admin.login.title')}
              </span>
            </h2>
            <p className="text-dark-600 font-tech">
              {t('admin.login.subtitle')}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login Type Selector */}
            <div>
              <label htmlFor="loginType" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                {t('admin.login.loginMethod')}
              </label>
              <select
                id="loginType"
                name="loginType"
                value={formData.loginType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-dark-50 border-2 border-dark-200 rounded-lg font-tech text-dark-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              >
                <option value="email">{t('admin.login.email')}</option>
                <option value="phone">{t('admin.login.phone')}</option>
              </select>
            </div>

            {/* Email/Phone Input */}
            {formData.loginType === 'email' ? (
              <div>
                <label htmlFor="email" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                  {t('admin.login.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-dark-50 border-2 border-dark-200 rounded-lg font-tech text-dark-800 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                  placeholder={t('admin.login.emailPlaceholder')}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                  {t('admin.login.phone')}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-dark-50 border-2 border-dark-200 rounded-lg font-tech text-dark-800 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                  placeholder={t('admin.login.phonePlaceholder')}
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                {t('admin.login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-dark-50 border-2 border-dark-200 rounded-lg font-tech text-dark-800 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                placeholder={t('admin.login.passwordPlaceholder')}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-xl"></div>
                <div className="relative bg-red-50 border-2 border-red-500 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-tech text-red-700">{error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-gaming font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('admin.login.authenticating')}</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t('admin.login.submit')}
                  </span>
                )}
              </div>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-dark-200">
            <p className="text-center text-sm font-tech text-dark-500">
              {t('admin.login.secureAuth')}
            </p>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-dark-600 hover:text-primary-500 font-tech transition-colors duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('admin.login.backToHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
