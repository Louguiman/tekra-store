'use client'

import { useState } from 'react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useCreateOrderMutation, useGetCartQuery, useClearCartMutation, useGetCountriesQuery, useGetDeliveryMethodsQuery, useCalculateDeliveryFeeMutation } from '../../store/api'
import { useAppSelector } from '../../store'
import type { CreateOrderRequest, DeliveryAddress, DeliveryMethodResponse } from '../../store/api'

interface CheckoutFormData {
  fullName: string
  phone: string
  email?: string
  address: string
  city: string
  postalCode?: string
  deliveryMethodId?: string
  isGuestCheckout: boolean
}

export function CheckoutForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<DeliveryMethodResponse | null>(null)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false)
  
  const { data: cart } = useGetCartQuery()
  const { data: countries } = useGetCountriesQuery()
  const selectedCountry = useAppSelector((state) => state.country.selectedCountry)
  const { data: deliveryMethods } = useGetDeliveryMethodsQuery(selectedCountry?.code || '', {
    skip: !selectedCountry?.code
  })
  const [createOrder] = useCreateOrderMutation()
  const [clearCart] = useClearCartMutation()
  const [calculateDeliveryFee] = useCalculateDeliveryFeeMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CheckoutFormData>({
    defaultValues: {
      isGuestCheckout: true
    }
  })

  const watchedCity = watch('city')
  const watchedDeliveryMethod = watch('deliveryMethodId')

  // Calculate delivery fee when city or delivery method changes
  const handleDeliveryCalculation = async (city: string, deliveryMethodId: string) => {
    if (!city || !deliveryMethodId || !selectedCountry) return

    setIsCalculatingDelivery(true)
    try {
      const result = await calculateDeliveryFee({
        countryCode: selectedCountry.code,
        deliveryMethodId,
        city,
        orderValue: cart?.totalAmount || 0
      }).unwrap()
      
      setDeliveryFee(result.deliveryFee)
      const method = deliveryMethods?.find(m => m.id === deliveryMethodId)
      setSelectedDeliveryMethod(method || null)
    } catch (error) {
      console.error('Failed to calculate delivery fee:', error)
      setDeliveryFee(0)
    } finally {
      setIsCalculatingDelivery(false)
    }
  }

  // Watch for changes in city and delivery method
  React.useEffect(() => {
    if (watchedCity && watchedDeliveryMethod) {
      handleDeliveryCalculation(watchedCity, watchedDeliveryMethod)
    }
  }, [watchedCity, watchedDeliveryMethod])

  const onSubmit = async (data: CheckoutFormData) => {
    if (!cart || cart.items.length === 0) {
      alert('Your cart is empty')
      return
    }

    if (!selectedCountry) {
      alert('Please select a country')
      return
    }

    if (!data.deliveryMethodId) {
      alert('Please select a delivery method')
      return
    }

    // Find the country ID from the API countries list
    const country = countries?.find(c => c.code === selectedCountry.code)
    if (!country) {
      alert('Selected country not found')
      return
    }

    setIsSubmitting(true)

    try {
      const deliveryAddress: DeliveryAddress = {
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
      }

      const orderRequest: CreateOrderRequest = {
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress,
        countryId: country.id,
        customerEmail: data.email,
        customerPhone: data.phone,
        // For guest checkout, don't include userId
        ...(data.isGuestCheckout ? {} : { userId: undefined })
      }

      const order = await createOrder(orderRequest).unwrap()
      
      // Clear cart after successful order
      await clearCart().unwrap()
      
      setOrderSuccess(order.orderNumber)
      reset()
      
      // Redirect to payment page instead of order page
      setTimeout(() => {
        router.push(`/payment/${order.id}`)
      }, 2000)
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('Failed to create order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 text-green-600">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          Order Created Successfully!
        </h2>
        <p className="text-green-700 mb-4">
          Your order number is: <strong>{orderSuccess}</strong>
        </p>
        <p className="text-sm text-green-600 mb-4">
          You will receive a confirmation email shortly.
        </p>
        <p className="text-xs text-green-600">
          Redirecting to order details...
        </p>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Your cart is empty. Add some items to checkout.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Checkout</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Guest Checkout Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGuestCheckout"
              {...register('isGuestCheckout')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isGuestCheckout" className="ml-2 block text-sm text-blue-800">
              Continue as guest (no account required)
            </label>
          </div>
          <p className="mt-1 text-xs text-blue-600">
            You can create an account after placing your order to track future purchases.
          </p>
        </div>

        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                {...register('fullName', { required: 'Full name is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                {...register('phone', { required: 'Phone number is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              We'll send order updates to this email if provided.
            </p>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Delivery Information</h3>
          
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <textarea
              id="address"
              rows={3}
              {...register('address', { required: 'Address is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Street address, building number, apartment, etc."
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <input
                type="text"
                id="city"
                {...register('city', { required: 'City is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                Postal Code (Optional)
              </label>
              <input
                type="text"
                id="postalCode"
                {...register('postalCode')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Delivery Method */}
        {deliveryMethods && deliveryMethods.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Delivery Method</h3>
            
            <div className="space-y-3">
              {deliveryMethods.map((method) => (
                <div key={method.id} className="flex items-start">
                  <input
                    type="radio"
                    id={`delivery-${method.id}`}
                    value={method.id}
                    {...register('deliveryMethodId', { required: 'Please select a delivery method' })}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor={`delivery-${method.id}`} className="ml-3 block text-sm">
                    <div className="font-medium text-gray-900">{method.name}</div>
                    <div className="text-gray-600">
                      {method.baseFee.toLocaleString()} FCFA - {method.estimatedDaysMin}-{method.estimatedDaysMax} days
                    </div>
                    {method.description && (
                      <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                    )}
                  </label>
                </div>
              ))}
            </div>
            
            {errors.deliveryMethodId && (
              <p className="text-sm text-red-600">{errors.deliveryMethodId.message}</p>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({cart?.totalItems || 0} items)</span>
              <span className="font-medium">{(cart?.totalAmount || 0).toLocaleString()} FCFA</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery</span>
              <span className="font-medium">
                {isCalculatingDelivery ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : deliveryFee > 0 ? (
                  `${deliveryFee.toLocaleString()} FCFA`
                ) : (
                  <span className="text-gray-400">Select delivery method</span>
                )}
              </span>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {((cart?.totalAmount || 0) + deliveryFee).toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCalculatingDelivery}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Order...
              </div>
            ) : (
              'Place Order'
            )}
          </button>
          
          <p className="mt-3 text-xs text-gray-500 text-center">
            By placing your order, you agree to our terms and conditions.
          </p>
        </div>
      </form>
    </div>
  )
}