'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CardPaymentData } from '@/store/api'

interface CardPaymentFormProps {
  amount: number
  onSubmit: (data: CardPaymentData) => void
  isLoading?: boolean
  error?: string
}

export function CardPaymentForm({ amount, onSubmit, isLoading, error }: CardPaymentFormProps) {
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CardPaymentData>()

  const cardNumber = watch('cardNumber')

  // Detect card type based on card number
  const detectCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '')
    if (cleaned.startsWith('4')) {
      return 'visa'
    } else if (cleaned.startsWith('5') || cleaned.startsWith('2')) {
      return 'mastercard'
    }
    return null
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(' ') : cleaned
  }

  const onFormSubmit = (data: CardPaymentData) => {
    // Remove spaces from card number before submitting
    const cleanedData = {
      ...data,
      cardNumber: data.cardNumber.replace(/\s/g, '')
    }
    onSubmit(cleanedData)
  }

  // Update card type when card number changes
  React.useEffect(() => {
    if (cardNumber) {
      setCardType(detectCardType(cardNumber))
    }
  }, [cardNumber])

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">💳</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Paiement par carte</h3>
          <p className="text-sm text-gray-600">Montant: {amount.toLocaleString()} FCFA</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-2">
            Nom du titulaire
          </label>
          <input
            type="text"
            id="cardholderName"
            {...register('cardholderName', {
              required: 'Le nom du titulaire est requis',
              minLength: {
                value: 2,
                message: 'Le nom doit contenir au moins 2 caractères'
              }
            })}
            placeholder="Nom complet tel qu'il apparaît sur la carte"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.cardholderName && (
            <p className="mt-1 text-sm text-red-600">{errors.cardholderName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de carte
          </label>
          <div className="relative">
            <input
              type="text"
              id="cardNumber"
              {...register('cardNumber', {
                required: 'Le numéro de carte est requis',
                pattern: {
                  value: /^[0-9\s]{13,19}$/,
                  message: 'Numéro de carte invalide'
                },
                onChange: (e) => {
                  e.target.value = formatCardNumber(e.target.value)
                }
              })}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {cardType && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {cardType === 'visa' ? (
                  <span className="text-blue-600 font-bold text-sm">VISA</span>
                ) : (
                  <span className="text-red-600 font-bold text-sm">MC</span>
                )}
              </div>
            )}
          </div>
          {errors.cardNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.cardNumber.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="expiryMonth" className="block text-sm font-medium text-gray-700 mb-2">
              Mois
            </label>
            <select
              id="expiryMonth"
              {...register('expiryMonth', { required: 'Mois requis' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            {errors.expiryMonth && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryMonth.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 mb-2">
              Année
            </label>
            <select
              id="expiryYear"
              {...register('expiryYear', { required: 'Année requise' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">YYYY</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
            {errors.expiryYear && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryYear.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
              CVV
            </label>
            <input
              type="text"
              id="cvv"
              {...register('cvv', {
                required: 'CVV requis',
                pattern: {
                  value: /^[0-9]{3,4}$/,
                  message: 'CVV invalide'
                }
              })}
              placeholder="123"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.cvv && (
              <p className="mt-1 text-sm text-red-600">{errors.cvv.message}</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">Paiement sécurisé</p>
              <p className="text-xs text-gray-600">Vos informations sont protégées par cryptage SSL</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Traitement en cours...
            </div>
          ) : (
            `Payer ${amount.toLocaleString()} FCFA`
          )}
        </button>
      </form>
    </div>
  )
}