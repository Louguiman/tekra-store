'use client'

import { useEffect, useState } from 'react'
import { PaymentStatus, PaymentStatusResponse, useGetPaymentStatusQuery } from '@/store/api'

interface PaymentStatusProps {
  transactionRef: string
  onStatusChange?: (status: PaymentStatus) => void
  onRetry?: () => void
}

export function PaymentStatusComponent({ transactionRef, onStatusChange, onRetry }: PaymentStatusProps) {
  const [pollingEnabled, setPollingEnabled] = useState(true)
  
  const { data: paymentStatus, error, refetch } = useGetPaymentStatusQuery(transactionRef, {
    pollingInterval: pollingEnabled ? 3000 : 0, // Poll every 3 seconds
    skip: !transactionRef,
  })

  useEffect(() => {
    if (paymentStatus) {
      onStatusChange?.(paymentStatus.status)
      
      // Stop polling if payment is completed, failed, or cancelled
      if (['completed', 'failed', 'cancelled'].includes(paymentStatus.status)) {
        setPollingEnabled(false)
      }
    }
  }, [paymentStatus, onStatusChange])

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        )
      case PaymentStatus.PROCESSING:
        return (
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        )
      case PaymentStatus.COMPLETED:
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case PaymentStatus.FAILED:
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case PaymentStatus.CANCELLED:
        return (
          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getStatusMessage = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return {
          title: 'Paiement en attente',
          description: 'Votre paiement est en cours de traitement...',
          color: 'text-blue-600'
        }
      case PaymentStatus.PROCESSING:
        return {
          title: 'Traitement en cours',
          description: 'Nous vérifions votre paiement auprès du fournisseur...',
          color: 'text-yellow-600'
        }
      case PaymentStatus.COMPLETED:
        return {
          title: 'Paiement réussi !',
          description: 'Votre paiement a été traité avec succès.',
          color: 'text-green-600'
        }
      case PaymentStatus.FAILED:
        return {
          title: 'Paiement échoué',
          description: paymentStatus?.failureReason || 'Le paiement n\'a pas pu être traité.',
          color: 'text-red-600'
        }
      case PaymentStatus.CANCELLED:
        return {
          title: 'Paiement annulé',
          description: 'Le paiement a été annulé.',
          color: 'text-gray-600'
        }
      default:
        return {
          title: 'Statut inconnu',
          description: 'Statut du paiement non reconnu.',
          color: 'text-gray-600'
        }
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Erreur de vérification
        </h3>
        <p className="text-red-600 mb-4">
          Impossible de vérifier le statut du paiement.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!paymentStatus) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du statut du paiement...</p>
      </div>
    )
  }

  const statusInfo = getStatusMessage(paymentStatus.status)

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {getStatusIcon(paymentStatus.status)}
        </div>
        
        <h3 className={`text-lg font-semibold mb-2 ${statusInfo.color}`}>
          {statusInfo.title}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {statusInfo.description}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Référence:</span>
              <div className="font-mono text-gray-900">{paymentStatus.transactionRef}</div>
            </div>
            <div>
              <span className="text-gray-500">Montant:</span>
              <div className="font-semibold text-gray-900">
                {paymentStatus.amount.toLocaleString()} FCFA
              </div>
            </div>
            <div>
              <span className="text-gray-500">Méthode:</span>
              <div className="text-gray-900 capitalize">
                {paymentStatus.paymentMethod.replace('_', ' ')}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <div className="text-gray-900">
                {new Date(paymentStatus.createdAt).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        </div>

        {paymentStatus.status === PaymentStatus.FAILED && paymentStatus.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Réessayer le paiement
          </button>
        )}

        {paymentStatus.status === PaymentStatus.COMPLETED && paymentStatus.completedAt && (
          <div className="text-sm text-green-600">
            Complété le {new Date(paymentStatus.completedAt).toLocaleString('fr-FR')}
          </div>
        )}

        {['pending', 'processing'].includes(paymentStatus.status) && (
          <div className="text-sm text-gray-500">
            <p>Veuillez patienter pendant que nous traitons votre paiement.</p>
            <p className="mt-1">Cette page se mettra à jour automatiquement.</p>
          </div>
        )}
      </div>
    </div>
  )
}