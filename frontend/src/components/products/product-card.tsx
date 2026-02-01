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
  [RefurbishedGrade.A]: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white',
  [RefurbishedGrade.B]: 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white',
  [RefurbishedGrade.C]: 'bg-gradient-to-r from-neon-orange to-secondary-500 text-white',
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
      
      toast.success('🎮 Added to your gaming arsenal!')
    } catch (error) {
      toast.error('⚠️ Failed to add to arsenal')
    }
  }

  const isInStock = product.inventory?.isInStock ?? true
  const stockQuantity = product.inventory?.quantity ?? 0

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="product-card hover-lift hover-glow">
        {/* Gaming Product Image */}
        <div className="relative aspect-square bg-gradient-to-br from-dark-200/50 to-dark-300/50 overflow-hidden rounded-t-xl">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dark-500">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Gaming Badges */}
          <div className="absolute top-3 left-3 space-y-2">
            {product.isRefurbished && product.refurbishedGrade && (
              <span className={`px-3 py-1 text-xs font-gaming font-bold rounded-full shadow-lg ${gradeColors[product.refurbishedGrade]}`}>
                GRADE {product.refurbishedGrade}
              </span>
            )}
            {originalPrice && (
              <span className="bg-gradient-to-r from-neon-pink to-secondary-500 text-white px-3 py-1 text-xs font-gaming font-bold rounded-full shadow-lg animate-pulse">
                SALE
              </span>
            )}
          </div>

          {/* Gaming Stock Status */}
          <div className="absolute top-3 right-3">
            {!isInStock && (
              <span className="bg-dark-100/90 backdrop-blur-sm text-dark-800 px-3 py-1 text-xs font-tech font-semibold rounded-full border border-dark-300/50">
                OUT OF STOCK
              </span>
            )}
          </div>

          {/* Gaming Overlay Effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-100/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        {/* Gaming Product Info */}
        <div className="p-6 relative">
          {/* Brand with gaming style */}
          <p className="text-sm text-primary-500 mb-2 font-tech font-semibold tracking-wider uppercase">{product.brand}</p>

          {/* Gaming Name */}
          <h3 className="font-tech font-bold text-dark-800 mb-3 line-clamp-2 group-hover:text-primary-500 transition-colors duration-300 text-lg">
            {product.name}
          </h3>

          {/* Gaming Segment */}
          <div className="flex items-center mb-4">
            <span className="px-3 py-1 bg-dark-200/50 text-dark-600 text-xs font-tech font-medium rounded-lg border border-dark-300/30 capitalize">
              {product.segment.replace('_', ' ')}
            </span>
          </div>

          {/* Gaming Price Display */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CurrencyDisplay 
                amount={price} 
                className="text-xl font-gaming font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500"
              />
              {originalPrice && (
                <CurrencyDisplay 
                  amount={originalPrice} 
                  className="text-sm text-dark-500 line-through font-tech"
                />
              )}
            </div>
          </div>

          {/* Gaming Warranty */}
          {product.warrantyMonths > 0 && (
            <div className="flex items-center mb-4 text-xs text-accent-500 font-tech">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {product.warrantyMonths} MONTH{product.warrantyMonths > 1 ? 'S' : ''} WARRANTY SHIELD
            </div>
          )}

          {/* Gaming Stock Info */}
          {isInStock && stockQuantity <= 5 && stockQuantity > 0 && (
            <div className="flex items-center mb-4 text-xs text-neon-orange font-tech font-semibold">
              <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              ONLY {stockQuantity} LEFT IN ARSENAL
            </div>
          )}

          {/* Gaming Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!isInStock || isAddingToCart}
            className="w-full relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`w-full py-3 px-6 rounded-xl font-tech font-bold text-sm transition-all duration-300 ${
              !isInStock 
                ? 'bg-dark-300 text-dark-600 border border-dark-400' 
                : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white border-2 border-transparent hover:border-primary-400 transform hover:scale-105'
            }`}>
              {isAddingToCart ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ADDING TO ARSENAL...
                </div>
              ) : !isInStock ? (
                'OUT OF STOCK'
              ) : (
                <span className="relative z-10">ADD TO ARSENAL</span>
              )}
            </div>
            
            {/* Gaming button glow effect */}
            {isInStock && !isAddingToCart && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-0 group-hover/btn:opacity-30 transition-opacity duration-300"></div>
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}