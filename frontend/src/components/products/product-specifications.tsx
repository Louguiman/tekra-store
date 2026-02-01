'use client'

import { ProductSpecification } from '@/store/api'

interface ProductSpecificationsProps {
  specifications: ProductSpecification[]
}

export function ProductSpecifications({ specifications }: ProductSpecificationsProps) {
  if (!specifications || specifications.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Technical Specifications</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        {specifications.map((spec) => (
          <div key={spec.id} className="flex justify-between py-3 border-b border-gray-100 last:border-b-0">
            <dt className="font-medium text-gray-700">{spec.name}</dt>
            <dd className="text-gray-900 text-right">{spec.value}</dd>
          </div>
        ))}
      </div>
    </div>
  )
}