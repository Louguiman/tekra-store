'use client'

import { useGetCartQuery, useClearCartMutation } from '../../store/api'
import { CartItemComponent } from './cart-item'

export function CartSummary() {
  const { data: cart, isLoading, error } = useGetCartQuery()
  const [clearCart, { isLoading: isClearingCart }] = useClearCartMutation()

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to remove all items from your cart?')) {
      try {
        await clearCart().unwrap()
      } catch (error) {
        console.error('Failed to clear cart:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="p-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Failed to load cart</p>
          <p className="text-sm text-gray-500 mt-1">Please refresh the page to try again</p>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m-9 0h9" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Your cart is empty</p>
          <p className="text-sm text-gray-400 mt-1">Add some products to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Shopping Cart ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})
        </h2>
        
        {cart.items.length > 0 && (
          <button
            onClick={handleClearCart}
            disabled={isClearingCart}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
          >
            {isClearingCart ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                Clearing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cart
              </>
            )}
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="divide-y divide-gray-200">
        {cart.items.map((item) => (
          <CartItemComponent key={item.productId} item={item} />
        ))}
      </div>

      {/* Cart Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Subtotal:</span>
          <span className="text-xl font-bold text-gray-900">
            {cart.totalAmount.toLocaleString()} FCFA
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Delivery fees and taxes calculated at checkout
        </p>
      </div>
    </div>
  )
}