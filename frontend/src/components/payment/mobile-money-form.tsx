'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PaymentMethod, MobileMoneyPaymentData } from '@/store/api'

interface MobileMoneyFormProps {
  provider: 'orange' | 'wave' | 'moov'
  amount: number
  onSubmit: (data: MobileMoneyPaymentData) => void
  isLoading?: boolean
  error?: string
}

export function MobileMoneyForm({ provider, amount, onSubmit, isLoading, error }: MobileMoneyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MobileMoneyPaymentData>({
    defaultValues: {
      provider,
    }
  })

  const getProviderInfo = (provider: string) => {
    const info = {
      orange: {
        name: 'Orange Money',
        icon: '🟠',
        color: 'orange',
        placeholder: '+223 XX XX XX XX',
        instructions: 'Entrez votre numéro Orange Money'
      },
      wave: {
        name: 'Wave',
        icon: '🌊',
        color: 'blue',
        placeholder: '+223 XX XX XX XX',
        instructions: 'Entrez votre numéro Wave'
      },
      moov: {
        name: 'Moov Money',
        icon: '🔴',
        color: 'red',
        placeholder: '+223 XX XX XX XX',
        instructions: 'Entrez votre numéro Moov Money'
      }
    }
    return info[provider as keyof typeof info]
  }

  const providerInfo = getProviderInfo(provider)

  const onFormSubmit = (data: MobileMoneyPaymentData) => {
    onSubmit(data)
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{providerInfo.icon}</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{providerInfo.name}</h3>
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
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            id="phoneNumber"
            {...register('phoneNumber', {
              required: 'Le numéro de téléphone est requis',
              pattern: {
                value: /^\+?[0-9\s-]{8,15}$/,
                message: 'Format de numéro invalide'
              }
            })}
            placeholder={providerInfo.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">{providerInfo.instructions}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions de paiement:</h4>
          <ol className="text-xs text-blue-700 space-y-1">
            <li>1. Vérifiez que votre numéro est correct</li>
            <li>2. Assurez-vous d'avoir suffisamment de solde</li>
            <li>3. Vous recevrez un code de confirmation par SMS</li>
            <li>4. Suivez les instructions reçues pour finaliser le paiement</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            providerInfo.color === 'orange' 
              ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
              : providerInfo.color === 'blue'
              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
          }`}
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