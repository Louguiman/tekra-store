'use client'

import { OrderHistory } from '@/components/orders/order-history'

export default function OrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            Track your orders and view your purchase history
          </p>
        </div>
        
        <OrderHistory />
      </div>
    </div>
  )
}