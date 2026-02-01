'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useGetProductBySlugQuery, useAddToCartMutation, RefurbishedGrade } from '@/store/api'
import { CurrencyDisplay } from '@/components/currency-display'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProductImageGallery } from './product-image-gallery'
import { ProductSpecifications } from './product-specifications'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface ProductDetailProps {
  slug: string
}

const gradeDescriptions = {
  [RefurbishedGrade.A]: 'Excellent condition - Like new with minimal signs of use',
  [RefurbishedGrade.B]: 'Good condition - Minor cosmetic wear, fully functional',
  [RefurbishedGrade.C]: 'Fair condition - Visible wear but fully functional',
}

export function ProductDetail({ slug }: ProductDetailProps) {
  const { selectedCountry } = useSelector((state: RootState) => state.country)
  const [quantity, setQuantity] = useState(1)
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation()

  const {
    data: product,
    isLoading,
    error,
  } = useGetProductBySlugQuery(slug)

  if (!selectedCountry) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Please select your country to view product details</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Product not found</p>
          <Link href="/products" className="btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  // Get price for the current country
  const countryPrice = product.prices.find(p => p.country.code === selectedCountry.code)
  const price = countryPrice?.promoPrice || countryPrice?.price || 0
  const originalPrice = countryPrice?.promoPrice ? countryPrice.price : null

  const isInStock = product.inventory?.isInStock ?? true
  const stockQuantity = product.inventory?.quantity ?? 0

  const handleAddToCart = async () => {
    try {
      await addToCart({
        productId: product.id,
        quantity,
      }).unwrap()
      
      toast.success(`${quantity} item(s) added to cart!`)
    } catch (error) {
      toast.error('Failed to add product to cart')
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= Math.min(stockQuantity, 10)) {
      setQuantity(newQuantity)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li><Link href="/" className="hover:text-primary-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/products" className="hover:text-primary-600">Products</Link></li>
          <li>/</li>
          <li><Link href={`/categories/${product.segment.replace('_', '-')}`} className="hover:text-primary-600 capitalize">
            {product.segment.replace('_', ' ')}
          </Link></li>
          <li>/</li>
          <li className="text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div>
          <ProductImageGallery images={product.images} productName={product.name} />
        </div>

        {/* Product Info */}
        <div>
          {/* Brand */}
          <p className="text-sm text-gray-500 mb-2">{product.brand}</p>

          {/* Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {/* Segment & Category */}
          <div className="flex items-center space-x-4 mb-4">
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
              {product.segment.replace('_', ' ')}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{product.category.name}</span>
          </div>

          {/* Refurbished Grade */}
          {product.isRefurbished && product.refurbishedGrade && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 text-sm font-medium rounded-full">
                  Grade {product.refurbishedGrade}
                </span>
                <span className="text-sm font-medium text-yellow-800">Refurbished Product</span>
              </div>
              <p className="text-sm text-yellow-700">
                {gradeDescriptions[product.refurbishedGrade]}
              </p>
            </div>
          )}

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <CurrencyDisplay 
                amount={price} 
                className="text-3xl font-bold text-gray-900"
              />
              {originalPrice && (
                <CurrencyDisplay 
                  amount={originalPrice} 
                  className="text-xl text-gray-500 line-through"
                />
              )}
              {originalPrice && (
                <span className="bg-red-500 text-white px-2 py-1 text-sm font-medium rounded-full">
                  {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Price includes all taxes</p>
          </div>

          {/* Warranty */}
          {product.warrantyMonths > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-800 font-medium">
                  {product.warrantyMonths} Month{product.warrantyMonths > 1 ? 's' : ''} Warranty
                </span>
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="mb-6">
            {isInStock ? (
              <div className="flex items-center space-x-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>In Stock</span>
                {stockQuantity <= 5 && (
                  <span className="text-orange-600">
                    (Only {stockQuantity} left)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Out of Stock</span>
              </div>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          {isInStock && (
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= Math.min(stockQuantity, 10)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full btn-primary py-3 text-lg"
              >
                {isAddingToCart ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding to Cart...
                  </div>
                ) : (
                  `Add ${quantity} to Cart`
                )}
              </button>
            </div>
          )}

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="mt-12">
        <ProductSpecifications specifications={product.specifications} />
      </div>
    </div>
  )
}