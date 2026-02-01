'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useGetOrderByNumberQuery } from '@/store/api'
import { CurrencyDisplay } from '@/components/currency-display'
import { OrderStatusDisplay } from '@/components/orders/order-status-display'
import { DeliveryTracking } from '@/components/orders/delivery-tracking'
import { SupportContact } from '@/components/support/support-contact'

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderNumber = params.orderNumber as string
  
  const { data: order, isLoading, error } = useGetOrderByNumberQuery(orderNumber, {
    skip: !orderNumber
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">
            We couldn't find an order with number "{orderNumber}". Please check the order number and try again.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Commande confirmée !</h1>
            <p className="text-gray-600 mb-4">
              Merci pour votre commande. Nous vous enverrons des mises à jour au fur et à mesure de son avancement.
            </p>
            
            <nav className="text-sm text-gray-500">
              <Link href="/" className="hover:text-primary-600">Accueil</Link>
              <span className="mx-2">/</span>
              <Link href="/orders" className="hover:text-primary-600">Mes commandes</Link>
              <span className="mx-2">/</span>
              <span>{order.orderNumber}</span>
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Progress */}
            <OrderStatusDisplay 
              status={order.status} 
              createdAt={order.createdAt}
              showProgress={true}
            />

            {/* Delivery Tracking */}
            <DeliveryTracking 
              orderId={order.id} 
              orderStatus={order.status}
            />

            {/* Order Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Détails de la commande</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Numéro de commande</p>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de commande</p>
                  <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <OrderStatusDisplay 
                    status={order.status} 
                    createdAt={order.createdAt}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pays</p>
                  <p className="font-medium text-gray-900">{order.country.name}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Articles commandés</h2>
              
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      {item.product.images[0] ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <Link href={`/products/${item.product.slug}`}>
                        <h3 className="font-medium text-gray-900 hover:text-primary-600 transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500">
                        Quantité: {item.quantity} × <CurrencyDisplay amount={item.unitPrice} />
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        <CurrencyDisplay amount={item.totalPrice} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Adresse de livraison</h2>
              
              <div className="text-gray-700">
                <p className="font-medium">{order.deliveryAddress.fullName}</p>
                <p>{order.deliveryAddress.address}</p>
                <p>
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.postalCode && `, ${order.deliveryAddress.postalCode}`}
                </p>
                <p className="mt-2">
                  <span className="text-sm text-gray-500">Téléphone: </span>
                  {order.deliveryAddress.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Résumé de la commande</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">
                    <CurrencyDisplay amount={order.totalAmount - order.deliveryFee} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Livraison</span>
                  <span className="font-medium">
                    <CurrencyDisplay amount={order.deliveryFee} />
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      <CurrencyDisplay amount={order.totalAmount} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 mb-6">
                <Link
                  href="/products"
                  className="w-full btn-primary text-center block"
                >
                  Continuer mes achats
                </Link>
                <button
                  onClick={() => window.print()}
                  className="w-full btn-secondary text-center"
                >
                  Imprimer la commande
                </button>
              </div>
            </div>

            {/* Support Contact */}
            <SupportContact orderId={order.orderNumber} />
          </div>
        </div>
      </div>
    </div>
  )
}