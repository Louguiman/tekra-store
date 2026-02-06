'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    resetType: 'email' as 'email' | 'phone'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const resetData = {
        ...(formData.resetType === 'email' 
          ? { email: formData.email }
          : { phone: formData.phone }
        )
      }

      const response = await fetch('/api/backend/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || t('auth.forgotPassword.error'))
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || t('auth.forgotPassword.error'))
    } finally {
      setIsLoading(false)
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

      {/* Forgot Password Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="card-gaming p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-gaming font-bold mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                {t('auth.forgotPassword.title')}
              </span>
            </h2>
            <p className="text-dark-600 font-tech">
              {t('auth.forgotPassword.subtitle')}
            </p>
          </div>

          {success ? (
            /* Success Message */
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-lg blur-xl"></div>
                <div className="relative bg-green-50 border-2 border-green-500 rounded-lg p-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-gaming font-bold text-green-700 mb-2">
                        {t('auth.forgotPassword.successTitle')}
                      </h3>
                      <p className="text-sm font-tech text-green-600">
                        {t('auth.forgotPassword.successMessage')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/login"
                className="block w-full relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-gaming font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 text-center">
                  {t('auth.forgotPassword.backToLogin')}
                </div>
              </Link>
            </div>
          ) : (
            /* Reset Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reset Type Selector */}
              <div>
                <label htmlFor="resetType" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                  {t('auth.forgotPassword.resetMethod')}
                </label>
                <select
                  id="resetType"
                  name="resetType"
                  value={formData.resetType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-dark-50 border-2 border-dark-200 rounded-lg font-tech text-dark-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                >
                  <option value="email">{t('auth.forgotPassword.email')}</option>
                  <option value="phone">{t('auth.forgotPassword.phone')}</option>
                </select>
              </div>

              {/* Email/Phone Input */}
              {formData.resetType === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                    {t('auth.forgotPassword.email')}
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
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="phone" className="block text-sm font-tech font-semibold text-dark-700 mb-2">
                    {t('auth.forgotPassword.phone')}
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
                    placeholder={t('auth.forgotPassword.phonePlaceholder')}
                  />
                </div>
              )}

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
                      <span>{t('auth.forgotPassword.sending')}</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {t('auth.forgotPassword.submit')}
                    </span>
                  )}
                </div>
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          {!success && (
            <div className="mt-8 pt-6 border-t border-dark-200">
              <p className="text-center text-sm font-tech text-dark-600">
                {t('auth.forgotPassword.rememberPassword')}{' '}
                <Link 
                  href="/auth/login" 
                  className="text-primary-500 hover:text-primary-400 font-semibold transition-colors duration-200"
                >
                  {t('auth.forgotPassword.signIn')}
                </Link>
              </p>
            </div>
          )}
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
            {t('auth.forgotPassword.backToHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
