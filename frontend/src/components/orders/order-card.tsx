'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Order } from '../../store/api'
import { WhatsAppButton } from '../support/whatsapp-button'
import { SupportContact } from '../support/support-contact'
import { DeliveryTracking } from './delivery-tracking'
import { OrderStatusDisplay } from './order-status-display'
import { CurrencyDisplay } from '../currency-display'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Link 
              href={`/orders/${order.orderNumber}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Commande #{order.orderNumber}
            </Link>
            <p className="text-sm text-gray-500">
              Passée le {formatDate(order.createdAt)}
            </p>
          </div>
          <OrderStatusDisplay 
            status={order.status} 
            createdAt={order.createdAt}
          />
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-600">
              {order.items.length} article{order.items.length !== 1 ? 's' : ''}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              <CurrencyDisplay amount={order.totalAmount} />
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
          </button>
        </div>

        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            {/* Order Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Articles commandés:</h4>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {item.product.images[0] && (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        width={50}
                        height={50}
                        className="rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <Link 
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        Qté: {item.quantity} × <CurrencyDisplay amount={item.unitPrice} />
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      <CurrencyDisplay amount={item.totalPrice} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Tracking */}
            <DeliveryTracking 
              orderId={order.id} 
              orderStatus={order.status}
            />

            {/* Delivery Address */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Adresse de livraison:</h4>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{order.deliveryAddress.fullName}</p>
                <p>{order.deliveryAddress.phone}</p>
                <p>{order.deliveryAddress.address}</p>
                <p>
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.postalCode && `, ${order.deliveryAddress.postalCode}`}
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium">
                  <CurrencyDisplay amount={order.totalAmount - order.deliveryFee} />
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-600">Livraison:</span>
                <span className="font-medium">
                  <CurrencyDisplay amount={order.deliveryFee} />
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  <CurrencyDisplay amount={order.totalAmount} />
                </span>
              </div>
            </div>

            {/* Support Contact Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Besoin d'aide avec cette commande ?</h4>
                <WhatsAppButton 
                  orderId={order.orderNumber}
                  variant="inline"
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📞 +223 XX XX XX XX</span>
                <span>📧 support@ecommerce.com</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}