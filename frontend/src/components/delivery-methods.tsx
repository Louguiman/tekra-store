'use client'

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { formatFCFA } from '@/utils/currency'

interface DeliveryMethod {
  id: string
  name: string
  type: 'own_delivery' | 'partner_logistics'
  baseFee: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  description?: string
  isActive: boolean
  countryCode: string
}

interface PickupPoint {
  id: string
  name: string
  address: string
  city: string
  phone?: string
  instructions?: string
  isActive: boolean
  countryCode: string
}

interface DeliveryMethodsProps {
  selectedMethod?: string
  selectedPickupPoint?: string
  onMethodSelect?: (methodId: string) => void
  onPickupPointSelect?: (pickupPointId: string) => void
  orderValue?: number
  city?: string
}

export function DeliveryMethods({ 
  selectedMethod, 
  selectedPickupPoint,
  onMethodSelect, 
  onPickupPointSelect,
  orderValue = 0,
  city = ''
}: DeliveryMethodsProps) {
  const { selectedCountry } = useSelector((state: RootState) => state.country)
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [deliveryFees, setDeliveryFees] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedCountry?.code) {
      fetchDeliveryOptions()
    }
  }, [selectedCountry?.code])

  useEffect(() => {
    if (selectedMethod && city) {
      calculateDeliveryFee()
    }
  }, [selectedMethod, city, orderValue])

  const fetchDeliveryOptions = async () => {
    try {
      setLoading(true)
      
      // Fetch delivery methods
      const methodsResponse = await fetch(`/api/delivery/methods/${selectedCountry?.code}`)
      if (methodsResponse.ok) {
        const methods = await methodsResponse.json()
        setDeliveryMethods(methods)
      }

      // Fetch pickup points for CI and BF
      if (['CI', 'BF'].includes(selectedCountry?.code || '')) {
        const pointsResponse = await fetch(`/api/delivery/pickup-points/${selectedCountry?.code}`)
        if (pointsResponse.ok) {
          const points = await pointsResponse.json()
          setPickupPoints(points)
        }
      }
    } catch (error) {
      console.error('Error fetching delivery options:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDeliveryFee = async () => {
    if (!selectedMethod || !selectedCountry?.code || !city) return

    try {
      const response = await fetch('/api/delivery/calculate-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: selectedCountry.code,
          deliveryMethodId: selectedMethod,
          city,
          orderValue,
        }),
      })

      if (response.ok) {
        const feeResult = await response.json()
        setDeliveryFees(prev => ({
          ...prev,
          [selectedMethod]: feeResult,
        }))
      }
    } catch (error) {
      console.error('Error calculating delivery fee:', error)
    }
  }

  if (!selectedCountry) {
    return (
      <div className="p-4 text-center text-gray-500">
        Veuillez sélectionner un pays pour voir les options de livraison
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Chargement des options de livraison...
      </div>
    )
  }

  if (deliveryMethods.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Aucune option de livraison disponible pour {selectedCountry.name}
      </div>
    )
  }

  const selectedMethodData = deliveryMethods.find(m => m.id === selectedMethod)
  const needsPickupPoint = selectedMethodData?.type === 'partner_logistics'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Options de livraison</h3>
      
      {/* Delivery Methods */}
      <div className="space-y-3">
        {deliveryMethods.map((method) => {
          const feeData = deliveryFees[method.id]
          const displayFee = feeData?.deliveryFee ?? method.baseFee
          
          return (
            <div
              key={method.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onMethodSelect?.(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={method.id}
                      checked={selectedMethod === method.id}
                      onChange={() => onMethodSelect?.(method.id)}
                      className="mr-3 text-blue-600"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{method.name}</h4>
                      {method.description && (
                        <p className="text-sm text-gray-600">{method.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {displayFee === 0 ? (
                      <span className="text-green-600">Gratuit</span>
                    ) : (
                      formatFCFA(displayFee)
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {method.estimatedDaysMin === method.estimatedDaysMax 
                      ? `${method.estimatedDaysMin} jour${method.estimatedDaysMin > 1 ? 's' : ''}`
                      : `${method.estimatedDaysMin}-${method.estimatedDaysMax} jours`
                    }
                  </div>
                </div>
              </div>
              
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  method.type === 'own_delivery' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {method.type === 'own_delivery' ? 'Livraison directe' : 'Point de retrait'}
                </span>
                
                {feeData?.freeDeliveryThreshold && orderValue < feeData.freeDeliveryThreshold && (
                  <span className="ml-2 text-xs text-green-600">
                    Livraison gratuite dès {formatFCFA(feeData.freeDeliveryThreshold)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pickup Points Selection */}
      {needsPickupPoint && pickupPoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900">Choisir un point de retrait</h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pickupPoints.map((point) => (
              <div
                key={point.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPickupPoint === point.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onPickupPointSelect?.(point.id)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="pickupPoint"
                    value={point.id}
                    checked={selectedPickupPoint === point.id}
                    onChange={() => onPickupPointSelect?.(point.id)}
                    className="mr-3 mt-1 text-blue-600"
                  />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{point.name}</h5>
                    <p className="text-sm text-gray-600">{point.address}</p>
                    <p className="text-sm text-gray-600">{point.city}</p>
                    {point.phone && (
                      <p className="text-sm text-gray-500">Tél: {point.phone}</p>
                    )}
                    {point.instructions && (
                      <p className="text-xs text-gray-500 mt-1">{point.instructions}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}