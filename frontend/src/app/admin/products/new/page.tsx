'use client'

import AdminLayout from '@/components/admin/admin-layout'
import ProductForm from '@/components/admin/product-form'

export default function NewProductPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add a new product to your catalog with specifications and pricing.
          </p>
        </div>

        <ProductForm />
      </div>
    </AdminLayout>
  )
}