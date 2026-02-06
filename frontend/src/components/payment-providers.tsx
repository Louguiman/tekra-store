'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { formatFCFA, calculateProcessingFee } from '@/utils/currency'

interface PaymentProvidersProps {
  selectedProvider?: string
  onProviderSelect?: (providerId: string) => void
  orderAmount?: number
}

export function PaymentProviders({ selectedProvider, onProviderSelect, orderAmount = 0 }: PaymentProvidersProps) {
  const { countryConfig, selectedCountry } = useSelector((state: RootState) => state.country)

  if (!countryConfig || !selectedCountry) {
    return (
      <div className="p-4 text-center text-gray-500">
        Veuillez sélectionner un pays pour voir les options de paiement
      </div>
    )
  }

  const paymentProviders = countryConfig.paymentProviders.filter(provider => provider.isActive)

  if (paymentProviders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Aucune option de paiement disponible pour {selectedCountry.name}
      </div>
    )
  }

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      'orange': '🟠',
      'wave': '🌊',
      'moov': '🔴',
      'visa': '💳',
      'mastercard': '💳',
    }
    return icons[provider] || '💳'
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'orange': 'bg-orange-100 text-orange-800 border-orange-200',
      'wave': 'bg-blue-100 text-blue-800 border-blue-200',
      'moov': 'bg-red-100 text-red-800 border-red-200',
      'visa': 'bg-purple-100 text-purple-800 border-purple-200',
      'mastercard': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return colors[provider] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Méthodes de paiement</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Cash on Delivery Option */}
        <div
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedProvider === 'cash_on_delivery'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onProviderSelect?.('cash_on_delivery')}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="paymentProvider"
              value="cash_on_delivery"
              checked={selectedProvider === 'cash_on_delivery'}
              onChange={() => onProviderSelect?.('cash_on_delivery')}
              className="mr-3 text-blue-600"
            />
            
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-2xl mr-2">💵</span>
                <div>
                  <h4 className="font-medium text-gray-900">Paiement à la livraison</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-green-200">
                    Espèces
                  </span>
                </div>
              </div>
              
              <div className="mt-1 text-sm text-green-600 font-medium">
                Aucun frais supplémentaire
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Payez en espèces lors de la réception
              </div>
            </div>
          </div>
        </div>

        {/* Online Payment Providers */}
        {paymentProviders.map((provider) => {
          const processingFee = provider.processingFee ? calculateProcessingFee(orderAmount, provider.processingFee) : 0
          const totalAmount = orderAmount + processingFee
          
          return (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedProvider === provider.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onProviderSelect?.(provider.id)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="paymentProvider"
                  value={provider.id}
                  checked={selectedProvider === provider.id}
                  onChange={() => onProviderSelect?.(provider.id)}
                  className="mr-3 text-blue-600"
                />
                
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">
                      {getProviderIcon(provider.provider)}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">{provider.name}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(provider.provider)}`}>
                        {provider.type === 'mobile_money' ? 'Mobile Money' : 'Carte bancaire'}
                      </span>
                    </div>
                  </div>
                  
                  {processingFee > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <div>Frais de traitement: {formatFCFA(processingFee)} ({provider.processingFee}%)</div>
                      {orderAmount > 0 && (
                        <div className="font-medium">Total: {formatFCFA(totalAmount)}</div>
                      )}
                    </div>
                  )}
                  
                  {processingFee === 0 && provider.type === 'mobile_money' && (
                    <div className="mt-1 text-sm text-green-600 font-medium">
                      Aucun frais supplémentaire
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {orderAmount > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Montant de la commande:</span>
              <span>{formatFCFA(orderAmount)}</span>
            </div>
            {selectedProvider && selectedProvider !== 'cash_on_delivery' && (
              <>
                {(() => {
                  const provider = paymentProviders.find(p => p.id === selectedProvider)
                  const fee = provider?.processingFee ? calculateProcessingFee(orderAmount, provider.processingFee) : 0
                  return fee > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Frais de traitement:</span>
                        <span>{formatFCFA(fee)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <span>Total à payer:</span>
                        <span>{formatFCFA(orderAmount + fee)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total à payer:</span>
                      <span>{formatFCFA(orderAmount)}</span>
                    </div>
                  )
                })()}
              </>
            )}
            {selectedProvider === 'cash_on_delivery' && (
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Total à payer:</span>
                <span>{formatFCFA(orderAmount)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}