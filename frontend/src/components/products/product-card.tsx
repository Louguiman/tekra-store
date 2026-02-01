'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product, RefurbishedGrade } from '@/store/api'
import { CurrencyDisplay } from '@/components/currency-display'
import { useAddToCartMutation } from '@/store/api'
import { toast } from 'react-hot-toast'

interface ProductCardProps {
  product: Product
  countryCode: string
}

const gradeColors = {
  [RefurbishedGrade.A]: 'bg-green-100 text-green-800',
  [RefurbishedGrade.B]: 'bg-yellow-100 text-yellow-800',
  [RefurbishedGrade.C]: 'bg-orange-100 text-orange-800',
}

export function ProductCard({ product, countryCode }: ProductCardProps) {
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation()

  // Get price for the current country
  const countryPrice = product.prices.find(p => p.country.code === countryCode)
  const price = countryPrice?.promoPrice || countryPrice?.price || 0
  const originalPrice = countryPrice?.promoPrice ? countryPrice.price : null

  // Get primary image
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0]

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking add to cart
    
    try {
      await addToCart({
        productId: product.id,
        quantity: 1,
      }).unwrap()
      
      toast.success('Product added to cart!')
    } catch (error) {
      toast.error('Failed to add product to cart')
    }
  }

  const isInStock = product.inventory?.isInStock ?? true
  const stockQuantity = product.inventory?.quantity ?? 0

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="card hover:shadow-lg transition-shadow duration-200 p-0 overflow-hidden">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 space-y-1">
            {product.isRefurbished && product.refurbishedGrade && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColors[product.refurbishedGrade]}`}>
                Grade {product.refurbishedGrade}
              </span>
            )}
            {originalPrice && (
              <span className="bg-red-500 text-white px-2 py-1 text-xs font-medium rounded-full">
                Sale
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="absolute top-2 right-2">
            {!isInStock && (
              <span className="bg-gray-900 text-white px-2 py-1 text-xs font-medium rounded-full">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Brand */}
          <p className="text-sm text-gray-500 mb-1">{product.brand}</p>

          {/* Name */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>

          {/* Segment */}
          <p className="text-xs text-gray-500 mb-2 capitalize">
            {product.segment.replace('_', ' ')}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CurrencyDisplay 
                amount={price} 
                className="text-lg font-bold text-gray-900"
              />
              {originalPrice && (
                <CurrencyDisplay 
                  amount={originalPrice} 
                  className="text-sm text-gray-500 line-through"
                />
              )}
            </div>
          </div>

          {/* Warranty */}
          {product.warrantyMonths > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              {product.warrantyMonths} month{product.warrantyMonths > 1 ? 's' : ''} warranty
            </p>
          )}

          {/* Stock Info */}
          {isInStock && stockQuantity <= 5 && stockQuantity > 0 && (
            <p className="text-xs text-orange-600 mb-3">
              Only {stockQuantity} left in stock
            </p>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!isInStock || isAddingToCart}
            className="w-full btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-sm py-2"
          >
            {isAddingToCart ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </div>
            ) : !isInStock ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}