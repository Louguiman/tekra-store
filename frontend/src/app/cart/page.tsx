'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useGetCartQuery } from '@/store/api'
import { CartSummary } from '@/components/cart/cart-summary'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { SupportInfo } from '@/components/support/support-info'
import { useAppSelector } from '@/store'

export default function CartPage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const { data: cart, isLoading } = useGetCartQuery()
  const selectedCountry = useAppSelector((state) => state.country.selectedCountry)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-4 border-b">
                      <div className="w-20 h-20 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedCountry) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Shopping Cart</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              Please select your country to view your cart and proceed with checkout.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isEmpty = !cart || cart.items.length === 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
        <nav className="text-sm text-gray-500">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Cart</span>
        </nav>
      </div>

      {isEmpty ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m-9 0h9" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet. Start shopping to fill it up!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <CartSummary />
            
            {!showCheckout && (
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/products"
                  className="flex-1 btn-secondary text-center"
                >
                  Continue Shopping
                </Link>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="flex-1 btn-primary"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}

            {/* Support Information */}
            <div className="mt-8">
              <SupportInfo variant="compact" />
            </div>
          </div>

          {/* Order Summary & Checkout */}
          <div className="lg:col-span-1">
            {showCheckout ? (
              <div className="space-y-6">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Cart
                </button>
                <CheckoutForm />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cart.totalItems} items)</span>
                    <span className="font-medium">{cart.totalAmount.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery</span>
                    <span className="text-sm text-gray-500">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {cart.totalAmount.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full btn-primary"
                >
                  Proceed to Checkout
                </button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Secure checkout powered by SSL encryption
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}