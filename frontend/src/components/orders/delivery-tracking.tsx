'use client'

import { useState } from 'react'
import { Package, Truck, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useGetDeliveryTrackingByOrderQuery } from '@/store/api'

interface DeliveryTrackingProps {
  orderId: string
  orderStatus: string
  className?: string
}

const statusIcons = {
  preparing: Package,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: CheckCircle,
  failed_delivery: AlertCircle,
}

const statusColors = {
  preparing: 'text-yellow-600 bg-yellow-100',
  in_transit: 'text-blue-600 bg-blue-100',
  out_for_delivery: 'text-purple-600 bg-purple-100',
  delivered: 'text-green-600 bg-green-100',
  failed_delivery: 'text-red-600 bg-red-100',
}

const statusLabels = {
  preparing: 'Préparation en cours',
  in_transit: 'En transit',
  out_for_delivery: 'En cours de livraison',
  delivered: 'Livré',
  failed_delivery: 'Échec de livraison',
}

export function DeliveryTracking({ orderId, orderStatus, className = '' }: DeliveryTrackingProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: trackingData, isLoading, error } = useGetDeliveryTrackingByOrderQuery(orderId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstimatedDelivery = () => {
    if (!trackingData || trackingData.length === 0) return null
    
    const latestTracking = trackingData[0]
    if (latestTracking.estimatedDeliveryDate) {
      return new Date(latestTracking.estimatedDeliveryDate).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    return null
  }

  // Show basic status if no tracking data available
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    )
  }

  if (error || !trackingData || trackingData.length === 0) {
    // Show basic order status when no tracking data
    const getOrderStatusDisplay = () => {
      switch (orderStatus) {
        case 'pending':
          return { icon: Clock, label: 'Commande en attente', color: 'text-yellow-600 bg-yellow-100' }
        case 'paid':
          return { icon: Package, label: 'Commande payée - Préparation', color: 'text-blue-600 bg-blue-100' }
        case 'shipped':
          return { icon: Truck, label: 'Commande expédiée', color: 'text-purple-600 bg-purple-100' }
        case 'delivered':
          return { icon: CheckCircle, label: 'Commande livrée', color: 'text-green-600 bg-green-100' }
        case 'cancelled':
          return { icon: AlertCircle, label: 'Commande annulée', color: 'text-red-600 bg-red-100' }
        default:
          return { icon: Clock, label: 'Statut inconnu', color: 'text-gray-600 bg-gray-100' }
      }
    }

    const statusDisplay = getOrderStatusDisplay()
    const StatusIcon = statusDisplay.icon

    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${statusDisplay.color}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Suivi de livraison</h3>
            <p className="text-sm text-gray-600">{statusDisplay.label}</p>
          </div>
        </div>
        
        {orderStatus === 'pending' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Votre commande est en attente de paiement. Une fois le paiement confirmé, nous commencerons la préparation.
            </p>
          </div>
        )}
      </div>
    )
  }

  const latestTracking = trackingData[0]
  const StatusIcon = statusIcons[latestTracking.status] || Package
  const estimatedDelivery = getEstimatedDelivery()

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${statusColors[latestTracking.status] || 'text-gray-600 bg-gray-100'}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Suivi de livraison</h3>
            <p className="text-sm text-gray-600">
              {statusLabels[latestTracking.status] || latestTracking.status}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Masquer' : 'Détails'}
        </button>
      </div>

      {/* Tracking Number and Estimated Delivery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {latestTracking.trackingNumber && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Numéro de suivi</p>
            <p className="font-mono text-sm font-medium text-gray-900">
              {latestTracking.trackingNumber}
            </p>
          </div>
        )}
        
        {estimatedDelivery && latestTracking.status !== 'delivered' && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Livraison estimée</p>
            <p className="text-sm font-medium text-gray-900">{estimatedDelivery}</p>
          </div>
        )}
        
        {latestTracking.actualDeliveryDate && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Livré le</p>
            <p className="text-sm font-medium text-green-600">
              {formatDate(latestTracking.actualDeliveryDate)}
            </p>
          </div>
        )}
      </div>

      {/* Carrier Information */}
      {latestTracking.carrierName && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Transporteur</p>
          <p className="text-sm font-medium text-gray-900">{latestTracking.carrierName}</p>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Historique de livraison</h4>
          <div className="space-y-3">
            {trackingData.map((tracking, index) => {
              const TrackingIcon = statusIcons[tracking.status] || Package
              const isLatest = index === 0
              
              return (
                <div key={tracking.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${isLatest ? statusColors[tracking.status] : 'text-gray-400 bg-gray-100'}`}>
                    <TrackingIcon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${isLatest ? 'text-gray-900' : 'text-gray-600'}`}>
                        {statusLabels[tracking.status] || tracking.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tracking.updatedAt)}
                      </p>
                    </div>
                    {tracking.deliveryNotes && (
                      <p className="text-xs text-gray-600 mt-1">
                        {tracking.deliveryNotes}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delivery Notes */}
      {latestTracking.deliveryNotes && !isExpanded && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-700">{latestTracking.deliveryNotes}</p>
        </div>
      )}

      {/* Failed Delivery Message */}
      {latestTracking.status === 'failed_delivery' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            La livraison a échoué. Notre équipe vous contactera pour reprogrammer la livraison.
          </p>
        </div>
      )}
    </div>
  )
}