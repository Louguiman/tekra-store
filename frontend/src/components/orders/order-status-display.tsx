'use client'

import { Clock, CreditCard, Package, Truck, CheckCircle, XCircle } from 'lucide-react'

interface OrderStatusDisplayProps {
  status: string
  createdAt: string
  className?: string
  showProgress?: boolean
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'En attente',
    description: 'Commande en attente de paiement',
    color: 'text-yellow-600 bg-yellow-100 border-yellow-200',
    progressColor: 'bg-yellow-500',
    step: 1
  },
  paid: {
    icon: CreditCard,
    label: 'Payée',
    description: 'Paiement confirmé, préparation en cours',
    color: 'text-blue-600 bg-blue-100 border-blue-200',
    progressColor: 'bg-blue-500',
    step: 2
  },
  shipped: {
    icon: Truck,
    label: 'Expédiée',
    description: 'Commande en cours de livraison',
    color: 'text-purple-600 bg-purple-100 border-purple-200',
    progressColor: 'bg-purple-500',
    step: 3
  },
  delivered: {
    icon: CheckCircle,
    label: 'Livrée',
    description: 'Commande livrée avec succès',
    color: 'text-green-600 bg-green-100 border-green-200',
    progressColor: 'bg-green-500',
    step: 4
  },
  cancelled: {
    icon: XCircle,
    label: 'Annulée',
    description: 'Commande annulée',
    color: 'text-red-600 bg-red-100 border-red-200',
    progressColor: 'bg-red-500',
    step: 0
  }
}

const allSteps = [
  { key: 'pending', label: 'Commande', icon: Clock },
  { key: 'paid', label: 'Paiement', icon: CreditCard },
  { key: 'shipped', label: 'Expédition', icon: Truck },
  { key: 'delivered', label: 'Livraison', icon: CheckCircle }
]

export function OrderStatusDisplay({ 
  status, 
  createdAt, 
  className = '', 
  showProgress = false 
}: OrderStatusDisplayProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = config.icon
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const orderDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure'
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
    }
  }

  if (showProgress && status !== 'cancelled') {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full border ${config.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{config.label}</h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 ml-11">
            {formatDate(createdAt)} • {getTimeAgo(createdAt)}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {allSteps.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = config.step > index + 1
              const isCurrent = config.step === index + 1
              const isUpcoming = config.step < index + 1

              return (
                <div key={step.key} className="flex flex-col items-center relative">
                  {/* Connection Line */}
                  {index < allSteps.length - 1 && (
                    <div className="absolute top-4 left-8 w-full h-0.5 bg-gray-200">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isCompleted ? config.progressColor : 'bg-gray-200'
                        }`}
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                  
                  {/* Step Circle */}
                  <div className={`
                    relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? `${config.progressColor} border-transparent text-white` 
                      : isCurrent 
                        ? `border-current ${config.color.split(' ')[0]} bg-white`
                        : 'border-gray-300 bg-white text-gray-400'
                    }
                  `}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  
                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Simple status display
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${config.color} ${className}`}>
      <StatusIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}