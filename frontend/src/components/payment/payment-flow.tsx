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

type PaymentStep = 'select_method' | 'enter_details' | 'processing' | 'confirmation' | 'status'

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
    </div>
  )
}