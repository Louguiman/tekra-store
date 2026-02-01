'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetOrderQuery } from '@/store/api'
import { PaymentFlow } from '@/components/payment/payment-flow'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface PaymentPageProps {
  params: {
    orderId: string
  }
}

export default function PaymentPage({ params }: PaymentPageProps) {
  const router = useRouter()
  const { data: order, isLoading, error } = useGetOrderQuery(params.orderId)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  useEffect(() => {
    // If order is already paid, redirect to order page
    if (order && order.status === 'paid') {
      router.push(`/orders/${order.orderNumber}`)
    }
  }, [order, router])

  const handlePaymentComplete = (transactionRef: string) => {
    setPaymentCompleted(true)
    // Show success message briefly then redirect
    setTimeout(() => {
      router.push(`/orders/${order?.orderNumber}`)
    }, 3000)
  }

  const handlePaymentFailed = (error: string) => {
    console.error('Payment failed:', error)
    // Could show a toast notification here
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Commande introuvable
          </h2>
          <p className="text-gray-600 mb-6">
            La commande que vous essayez de payer n'existe pas ou n'est plus disponible.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Paiement réussi !
          </h2>
          <p className="text-green-700 mb-4">
            Votre paiement a été traité avec succès.
          </p>
          <p className="text-sm text-green-600">
            Redirection vers votre commande...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paiement de la commande #{order.orderNumber}
          </h1>
          <p className="text-gray-600">
            Montant total: <span className="font-semibold">{order.totalAmount.toLocaleString()} FCFA</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la commande</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center">
                  {item.product.images.length > 0 && (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  {item.totalPrice.toLocaleString()} FCFA
                </p>
              </div>
            ))}
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total:</span>
                <span>{(order.totalAmount - order.deliveryFee).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Livraison:</span>
                <span>{order.deliveryFee.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>{order.totalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </div>

        <PaymentFlow
          orderId={order.id}
          orderNumber={order.orderNumber}
          amount={order.totalAmount}
          onPaymentComplete={handlePaymentComplete}
          onPaymentFailed={handlePaymentFailed}
        />
      </div>
    </div>
  )
}