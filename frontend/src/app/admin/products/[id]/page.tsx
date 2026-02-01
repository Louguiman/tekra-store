'use client'

import { useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'
import ProductForm from '@/components/admin/product-form'
import { useGetProductQuery } from '@/store/api'

export default function EditProductPage() {
  const params = useParams()
  const productId = params.id as string

  const { data: product, isLoading, error } = useGetProductQuery(productId)

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !product) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">
            Product not found or error loading product data.
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-sm text-gray-600">
            Update product information, specifications, and pricing.
          </p>
        </div>

        <ProductForm product={product} />
      </div>
    </AdminLayout>
  )
}