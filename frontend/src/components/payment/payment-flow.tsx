'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { 
  PaymentMethod, 
  PaymentStatus, 
  MobileMoneyPaymentData, 
  CardPaymentData,
  useInitiatePaymentMutation,
  useRetryPaymentMutation,
  PaymentInitiationResponse
} from '@/store/api'
import { PaymentProviders } from '../payment-providers'
import { MobileMoneyForm } from './mobile-money-form'
import { CardPaymentForm } from './card-payment-form'
import { PaymentConfirmation } from './payment-confirmation'
import { PaymentStatusComponent } from './payment-status'

interface PaymentFlowProps {
  orderId: string
  orderNumber: string
  amount: number
  onPaymentComplete?: (transactionRef: string) => void
  onPaymentFailed?: (error: string) => void
}

type PaymentStep = 'select_method' | 'enter_details' | 'processing' | 'confirmation' | 'status' | 'cod_confirmation'

export function PaymentFlow({ 
  orderId, 
  orderNumber, 
  amount, 
  onPaymentComplete, 
  onPaymentFailed 
}: PaymentFlowProps) {
  const router = useRouter()
  const { countryConfig, selectedCountry } = useSelector((state: RootState) => state.country)
  
  const [currentStep, setCurrentStep] = useState<PaymentStep>('select_method')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [paymentResponse, setPaymentResponse] = useState<PaymentInitiationResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const [initiatePayment] = useInitiatePaymentMutation()
  const [retryPayment] = useRetryPaymentMutation()

  const handleProviderSelect = useCallback((providerId: string) => {
    // Check if Cash on Delivery is selected
    if (providerId === 'cash_on_delivery') {
      setSelectedProviderId(providerId)
      setSelectedPaymentMethod(null) // COD doesn't use PaymentMethod enum
      setCurrentStep('cod_confirmation')
      setError('')
      return
    }

    if (!countryConfig) return

    const provider = countryConfig.paymentProviders.find(p => p.id === providerId)
    if (!provider) return

    setSelectedProviderId(providerId)
    
    // Map provider type to PaymentMethod enum
    let paymentMethod: PaymentMethod
    switch (provider.provider) {
      case 'orange':
        paymentMethod = PaymentMethod.ORANGE_MONEY
        break
      case 'wave':
        paymentMethod = PaymentMethod.WAVE
        break
      case 'moov':
        paymentMethod = PaymentMethod.MOOV
        break
      case 'visa':
      case 'mastercard':
        paymentMethod = PaymentMethod.CARD
        break
      default:
        return
    }

    setSelectedPaymentMethod(paymentMethod)
    setCurrentStep('enter_details')
    setError('')
  }, [countryConfig])

  const handleMobileMoneySubmit = useCallback(async (data: MobileMoneyPaymentData) => {
    if (!selectedPaymentMethod) return

    setIsLoading(true)
    setError('')

    try {
      const response = await initiatePayment({
        orderId,
        paymentMethod: selectedPaymentMethod,
        amount,
        customerPhone: data.phoneNumber,
      }).unwrap()

      setPaymentResponse(response)
      setCurrentStep('confirmation')
      
      // If payment is immediately completed (unlikely for mobile money)
      if (response.status === PaymentStatus.COMPLETED) {
        onPaymentComplete?.(response.transactionRef)
      }
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Erreur lors de l\'initiation du paiement'
      setError(errorMessage)
      onPaymentFailed?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPaymentMethod, orderId, amount, initiatePayment, onPaymentComplete, onPaymentFailed])

  const handleCardSubmit = useCallback(async (data: CardPaymentData) => {
    if (!selectedPaymentMethod) return

    setIsLoading(true)
    setError('')

    try {
      const response = await initiatePayment({
        orderId,
        paymentMethod: selectedPaymentMethod,
        amount,
        // Note: In a real implementation, card details would be handled securely
        // This is just for demonstration
      }).unwrap()

      setPaymentResponse(response)
      setCurrentStep('confirmation')
      
      if (response.status === PaymentStatus.COMPLETED) {
        onPaymentComplete?.(response.transactionRef)
      }
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Erreur lors du traitement de la carte'
      setError(errorMessage)
      onPaymentFailed?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPaymentMethod, orderId, amount, initiatePayment, onPaymentComplete, onPaymentFailed])

  const handleRetryPayment = useCallback(async () => {
    if (!paymentResponse) return

    setIsLoading(true)
    setError('')

    try {
      const response = await retryPayment({
        transactionRef: paymentResponse.transactionRef,
        paymentMethod: selectedPaymentMethod || undefined
      }).unwrap()

      setPaymentResponse(response)
      setCurrentStep('confirmation')
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Erreur lors de la nouvelle tentative'
      setError(errorMessage)
      onPaymentFailed?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [paymentResponse, selectedPaymentMethod, retryPayment, onPaymentFailed])

  const handleStatusChange = useCallback((status: PaymentStatus) => {
    if (status === PaymentStatus.COMPLETED && paymentResponse) {
      onPaymentComplete?.(paymentResponse.transactionRef)
    } else if (status === PaymentStatus.FAILED && paymentResponse) {
      onPaymentFailed?.('Le paiement a échoué')
    }
  }, [paymentResponse, onPaymentComplete, onPaymentFailed])

  const handleBackToMethodSelection = () => {
    setCurrentStep('select_method')
    setSelectedPaymentMethod(null)
    setSelectedProviderId('')
    setError('')
  }

  const handleViewPaymentStatus = () => {
    setCurrentStep('status')
  }

  if (!countryConfig || !selectedCountry) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Veuillez sélectionner un pays pour continuer</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${currentStep === 'select_method' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              ['select_method'].includes(currentStep) ? 'bg-blue-600 text-white' : 
              ['enter_details', 'processing', 'confirmation', 'status'].includes(currentStep) ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Méthode</span>
          </div>
          
          <div className={`flex items-center ${currentStep === 'enter_details' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              ['enter_details'].includes(currentStep) ? 'bg-blue-600 text-white' : 
              ['processing', 'confirmation', 'status'].includes(currentStep) ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Détails</span>
          </div>
          
          <div className={`flex items-center ${['confirmation', 'status'].includes(currentStep) ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              ['confirmation', 'status'].includes(currentStep) ? 'bg-blue-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'select_method' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Choisissez votre méthode de paiement
          </h2>
          <PaymentProviders
            selectedProvider={selectedProviderId}
            onProviderSelect={handleProviderSelect}
            orderAmount={amount}
          />
        </div>
      )}

      {currentStep === 'enter_details' && selectedPaymentMethod && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Détails de paiement
            </h2>
            <button
              onClick={handleBackToMethodSelection}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Changer de méthode
            </button>
          </div>

          {[PaymentMethod.ORANGE_MONEY, PaymentMethod.WAVE, PaymentMethod.MOOV].includes(selectedPaymentMethod) && (
            <MobileMoneyForm
              provider={selectedPaymentMethod.replace('_money', '') as 'orange' | 'wave' | 'moov'}
              amount={amount}
              onSubmit={handleMobileMoneySubmit}
              isLoading={isLoading}
              error={error}
            />
          )}

          {selectedPaymentMethod === PaymentMethod.CARD && (
            <CardPaymentForm
              amount={amount}
              onSubmit={handleCardSubmit}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>
      )}

      {currentStep === 'confirmation' && paymentResponse && selectedPaymentMethod && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Confirmation de paiement
            </h2>
            <button
              onClick={handleViewPaymentStatus}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Voir le statut →
            </button>
          </div>

          <PaymentConfirmation
            paymentResponse={paymentResponse}
            orderNumber={orderNumber}
            amount={amount}
            paymentMethod={selectedPaymentMethod}
          />
        </div>
      )}

      {currentStep === 'status' && paymentResponse && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Statut du paiement
          </h2>

          <PaymentStatusComponent
            transactionRef={paymentResponse.transactionRef}
            onStatusChange={handleStatusChange}
            onRetry={handleRetryPayment}
          />
        </div>
      )}

      {currentStep === 'cod_confirmation' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Paiement à la livraison
          </h2>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Commande confirmée !
                </h3>
                <p className="text-gray-600 mb-4">
                  Votre commande <strong>#{orderNumber}</strong> a été enregistrée avec succès.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Instructions de paiement :</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Préparez le montant exact : <strong>{amount.toLocaleString()} FCFA</strong></span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Le livreur vous contactera avant la livraison</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Vérifiez votre commande avant de payer</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Payez en espèces au livreur lors de la réception</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <strong>Note importante :</strong> Assurez-vous d'être disponible pour recevoir votre commande. 
                      Des frais supplémentaires peuvent s'appliquer en cas de tentative de livraison infructueuse.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push(`/orders/${orderNumber}`)}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                >
                  Voir ma commande
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}