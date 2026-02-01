'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentInitiationResponse, PaymentStatus, PaymentMethod } from '@/store/api'

interface PaymentConfirmationProps {
  paymentResponse: PaymentInitiationResponse
  orderNumber: string
  amount: number
  paymentMethod: PaymentMethod
}

export function PaymentConfirmation({ 
  paymentResponse, 
  orderNumber, 
  amount, 
  paymentMethod 
}: PaymentConfirmationProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (paymentResponse.expiresAt) {
      const expiryTime = new Date(paymentResponse.expiresAt).getTime()
      const now = Date.now()
      const initialTimeLeft = Math.max(0, Math.floor((expiryTime - now) / 1000))
      
      setTimeLeft(initialTimeLeft)

      const timer = setInterval(() => {
        const currentTime = Date.now()
        const remaining = Math.max(0, Math.floor((expiryTime - currentTime) / 1000))
        setTimeLeft(remaining)
        
        if (remaining <= 0) {
          clearInterval(timer)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [paymentResponse.expiresAt])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getPaymentMethodInfo = (method: PaymentMethod) => {
    const info = {
      [PaymentMethod.ORANGE_MONEY]: {
        name: 'Orange Money',
        icon: '🟠',
        color: 'orange'
      },
      [PaymentMethod.WAVE]: {
        name: 'Wave',
        icon: '🌊',
        color: 'blue'
      },
      [PaymentMethod.MOOV]: {
        name: 'Moov Money',
        icon: '🔴',
        color: 'red'
      },
      [PaymentMethod.CARD]: {
        name: 'Carte bancaire',
        icon: '💳',
        color: 'gray'
      }
    }
    return info[method]
  }

  const methodInfo = getPaymentMethodInfo(paymentMethod)

  const handleContinueToOrder = () => {
    router.push(`/orders/${orderNumber}`)
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Paiement initié avec succès !
        </h2>

        <p className="text-gray-600 mb-6">
          Votre commande #{orderNumber} a été créée et le paiement est en cours de traitement.
        </p>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-3">
            <span className="text-2xl mr-2">{methodInfo.icon}</span>
            <span className="font-medium text-gray-900">{methodInfo.name}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Référence:</span>
              <span className="font-mono text-gray-900">{paymentResponse.transactionRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Montant:</span>
              <span className="font-semibold text-gray-900">{amount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Statut:</span>
              <span className="text-blue-600 capitalize">
                {paymentResponse.status === PaymentStatus.PENDING ? 'En attente' : 'En cours'}
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        {timeLeft !== null && timeLeft > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-yellow-800">
                Temps restant: {formatTime(timeLeft)}
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              Veuillez compléter votre paiement avant l'expiration.
            </p>
          </div>
        )}

        {/* Instructions */}
        {paymentResponse.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
            <p className="text-sm text-blue-700 whitespace-pre-line">
              {paymentResponse.instructions}
            </p>
          </div>
        )}

        {/* Payment URL or QR Code */}
        {paymentResponse.paymentUrl && (
          <div className="mb-6">
            <a
              href={paymentResponse.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Compléter le paiement
            </a>
          </div>
        )}

        {paymentResponse.qrCode && (
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <img 
                src={paymentResponse.qrCode} 
                alt="QR Code de paiement" 
                className="mx-auto max-w-32 max-h-32"
              />
              <p className="text-xs text-gray-500 mt-2">
                Scannez ce code QR avec votre application de paiement
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinueToOrder}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Voir ma commande
          </button>
          
          <button
            onClick={handleBackToHome}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Retour à l'accueil
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            En cas de problème, contactez notre support avec la référence: 
            <span className="font-mono ml-1">{paymentResponse.transactionRef}</span>
          </p>
        </div>
      </div>
    </div>
  )
}