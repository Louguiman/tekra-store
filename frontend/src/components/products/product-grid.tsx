'use client'

import { Product } from '@/store/api'
import { ProductCard } from './product-card'

interface ProductGridProps {
  products: Product[]
  countryCode: string
}

export function ProductGrid({ products, countryCode }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          countryCode={countryCode}
        />
      ))}
    </div>
  )
}