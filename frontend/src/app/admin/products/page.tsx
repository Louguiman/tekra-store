'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/admin-layout'
import { useGetProductsQuery, useDeleteProductMutation } from '@/store/api'
import Link from 'next/link'
import { RefurbishedGrade, ProductSegment } from '@/types/product'

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  const { data: productsData, isLoading, error, refetch } = useGetProductsQuery({
    search: searchTerm,
    segment: selectedSegment as ProductSegment | undefined,
    categoryId: selectedCategory,
    page: 1,
    limit: 20
  })

  const [deleteProduct] = useDeleteProductMutation()

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        await deleteProduct(productId).unwrap()
        refetch()
      } catch (error) {
        console.error('Failed to delete product:', error)
        alert('Failed to delete product. Please try again.')
      }
    }
  }

  const getRefurbishedBadge = (grade: RefurbishedGrade) => {
    const colors = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-yellow-100 text-yellow-800',
      C: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[grade]}`}>
        Grade {grade}
      </span>
    )
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="card-gaming border-red-500 border-opacity-50 p-4">
          <div className="text-red-400 font-tech">
            Error loading products. Please try again later.
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-gaming font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              PRODUCT MANAGEMENT
            </h1>
            <p className="mt-2 text-sm text-dark-600 font-tech">
              Manage your product catalog, specifications, and inventory.
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="btn-primary font-tech"
          >
            + Add New Product
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="card-gaming">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="search" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, brand, or description..."
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="segment" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Product Segment
              </label>
              <select
                id="segment"
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="input-field"
              >
                <option value="">All Segments</option>
                <option value="premium">Premium/Gaming</option>
                <option value="mid_range">Mid-Range</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                <option value="">All Categories</option>
                {/* Categories will be populated dynamically */}
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="card-gaming">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-gaming font-bold text-primary-400 mb-4">
              PRODUCTS ({productsData?.total || 0})
            </h3>
            
            {productsData?.products && productsData.products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-300 divide-opacity-30">
                  <thead className="bg-dark-200 bg-opacity-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Segment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Price Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-gaming font-medium text-primary-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-300 divide-opacity-20">
                    {productsData.products.map((product) => (
                      <tr key={product.id} className="hover:bg-dark-200 hover:bg-opacity-30 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  className="h-10 w-10 rounded-lg object-cover border border-primary-500 border-opacity-30"
                                  src={product.images[0].url}
                                  alt={product.images[0].altText || product.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-dark-200 flex items-center justify-center border border-primary-500 border-opacity-30">
                                  <svg className="h-6 w-6 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-tech font-semibold text-dark-800">
                                {product.name}
                              </div>
                              <div className="text-sm text-dark-600 font-tech">
                                {product.brand}
                              </div>
                              {product.isRefurbished && product.refurbishedGrade && (
                                <div className="mt-1">
                                  {getRefurbishedBadge(product.refurbishedGrade)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700 font-tech">
                          {product.category?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700 font-tech">
                          {product.segment?.replace('_', ' ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700 font-tech">
                          {product.prices && product.prices.length > 0 ? (
                            <div>
                              {Math.min(...product.prices.map(p => p.price)).toLocaleString()} - {Math.max(...product.prices.map(p => p.price)).toLocaleString()} FCFA
                            </div>
                          ) : (
                            'No pricing'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">
                          {product.inventory ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-tech font-semibold rounded-full ${
                              product.inventory.quantity > 10 ? 'bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30' :
                              product.inventory.quantity > 0 ? 'bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500 border-opacity-30' :
                              'bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30'
                            }`}>
                              {product.inventory.quantity} units
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-tech font-semibold rounded-full bg-dark-300 bg-opacity-20 text-dark-600 border border-dark-300 border-opacity-30">
                              No stock data
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-tech font-semibold rounded-full bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-tech font-medium">
                          <div className="flex justify-end space-x-3">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-primary-400 hover:text-primary-300 transition-colors duration-200"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="text-red-400 hover:text-red-300 transition-colors duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-tech font-medium text-dark-700">No products</h3>
                <p className="mt-1 text-sm text-dark-600 font-tech">
                  Get started by creating a new product.
                </p>
                <div className="mt-6">
                  <Link
                    href="/admin/products/new"
                    className="btn-primary font-tech"
                  >
                    + Add New Product
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}