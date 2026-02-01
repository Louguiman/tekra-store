'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUpdateCartItemMutation, useRemoveFromCartMutation } from '../../store/api'
import type { CartItem } from '../../store/api'

interface CartItemProps {
  item: CartItem
}

export function CartItemComponent({ item }: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation()
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation()

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return
    
    setQuantity(newQuantity)
    try {
      await updateCartItem({
        productId: item.productId,
        quantity: newQuantity,
      }).unwrap()
    } catch (error) {
      console.error('Failed to update cart item:', error)
      setQuantity(item.quantity) // Revert on error
    }
  }

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove this item from your cart?')) {
      try {
        await removeFromCart(item.productId).unwrap()
      } catch (error) {
        console.error('Failed to remove cart item:', error)
      }
    }
  }

  const totalPrice = item.unitPrice * quantity

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <Link href={`/products/${item.product.slug}`}>
          {item.product.images[0] ? (
            <Image
              src={item.product.images[0].url}
              alt={item.product.name}
              width={100}
              height={100}
              className="rounded-lg object-cover hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-[100px] h-[100px] bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>
      </div>
      
      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.product.slug}`}>
          <h3 className="font-medium text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
            {item.product.name}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mt-1">
          {item.unitPrice.toLocaleString()} FCFA each
        </p>
        
        {/* Mobile: Quantity and Price */}
        <div className="sm:hidden mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1 || isUpdating}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={isUpdating}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              >
                +
              </button>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {totalPrice.toLocaleString()} FCFA
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
          >
            {isRemoving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                Removing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </>
            )}
          </button>
        </div>
      </div>

      {/* Desktop: Quantity Controls */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={() => handleQuantityChange(quantity - 1)}
          disabled={quantity <= 1 || isUpdating}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -
        </button>
        <span className="w-12 text-center font-medium">{quantity}</span>
        <button
          onClick={() => handleQuantityChange(quantity + 1)}
          disabled={isUpdating}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* Desktop: Price and Remove */}
      <div className="hidden sm:block text-right min-w-[120px]">
        <p className="font-semibold text-gray-900 mb-2">
          {totalPrice.toLocaleString()} FCFA
        </p>
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
        >
          {isRemoving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
              Removing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </>
          )}
        </button>
      </div>
    </div>
  )
}