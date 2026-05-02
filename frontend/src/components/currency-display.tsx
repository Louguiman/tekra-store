'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { formatFCFA } from '@/utils/currency'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  showCurrency?: boolean
  promoAmount?: number
}

export function CurrencyDisplay({ 
  amount, 
  className = '', 
  showCurrency = true,
  promoAmount 
}: CurrencyDisplayProps) {
  const { selectedCountry } = useSelector((state: RootState) => state.country)

  // For now, all countries use FCFA, but this component is ready for future expansion
  const formatAmount = (value: any) => {
    // Ensure value is a number (Postgres numeric types often come back as strings)
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) return '0 FCFA';

    if (!showCurrency) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(numericValue))
    }
    
    return formatFCFA(numericValue)
  }

  if (promoAmount && promoAmount < amount) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-red-600 font-semibold">
          {formatAmount(promoAmount)}
        </span>
        <span className="text-gray-500 line-through text-sm">
          {formatAmount(amount)}
        </span>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
          -{Math.round(((amount - promoAmount) / amount) * 100)}%
        </span>
      </div>
    )
  }

  return (
    <span className={className}>
      {formatAmount(amount)}
    </span>
  )
}

interface PriceRangeDisplayProps {
  minPrice: number
  maxPrice: number
  className?: string
}

export function PriceRangeDisplay({ minPrice, maxPrice, className = '' }: PriceRangeDisplayProps) {
  if (minPrice === maxPrice) {
    return <CurrencyDisplay amount={minPrice} className={className} />
  }

  return (
    <span className={className}>
      {formatFCFA(minPrice)} - {formatFCFA(maxPrice)}
    </span>
  )
}