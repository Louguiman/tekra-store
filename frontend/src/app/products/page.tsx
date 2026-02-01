import { Metadata } from 'next'
import { ProductCatalog } from '@/components/products/product-catalog'

export const metadata: Metadata = {
  title: 'Products - WestTech',
  description: 'Browse our complete catalog of premium technology products for West Africa',
}

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          All Products
        </h1>
        <p className="text-lg text-gray-600">
          Discover our complete range of technology products with local payment methods and delivery
        </p>
      </div>
      
      <ProductCatalog />
    </div>
  )
}