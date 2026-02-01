'use client'

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { 
  useGetProductsQuery, 
  useGetProductsBySegmentQuery,
  ProductSegment, 
  ProductFilters 
} from '@/store/api'
import { ProductGrid } from './product-grid'
import { ProductFiltersComponent } from './product-filters'
import { LoadingSpinner } from '../ui/loading-spinner'

interface ProductCatalogProps {
  segment?: ProductSegment
  categoryId?: string
}

export function ProductCatalog({ segment, categoryId }: ProductCatalogProps) {
  const { selectedCountry } = useSelector((state: RootState) => state.country)
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 12,
    countryCode: selectedCountry?.code,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  // Update filters when country changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      countryCode: selectedCountry?.code,
    }))
  }, [selectedCountry])

  // Use appropriate query based on props
  const queryFilters = {
    ...filters,
    ...(categoryId && { categoryId }),
  }

  const {
    data: productsData,
    isLoading,
    error,
  } = segment 
    ? useGetProductsBySegmentQuery({ segment, filters: queryFilters })
    : useGetProductsQuery(queryFilters)

  const handleFiltersChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  if (!selectedCountry) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Please select your country to view products</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading products</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ProductFiltersComponent 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        segment={segment}
      />

      {/* Results Summary */}
      {productsData && (
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            Showing {((filters.page || 1) - 1) * (filters.limit || 12) + 1}-
            {Math.min((filters.page || 1) * (filters.limit || 12), productsData.total)} of {productsData.total} products
          </p>
          
          {/* Sort Options */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-')
              handleFiltersChange({ 
                sortBy: sortBy as ProductFilters['sortBy'], 
                sortOrder: sortOrder as 'asc' | 'desc' 
              })
            }}
            className="input-field w-auto"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low to High</option>
            <option value="price-desc">Price High to Low</option>
          </select>
        </div>
      )}

      {/* Product Grid */}
      {productsData && (
        <>
          <ProductGrid 
            products={productsData.products}
            countryCode={selectedCountry.code}
          />

          {/* Pagination */}
          {productsData.totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={filters.page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: productsData.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg ${
                    page === filters.page 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={filters.page === productsData.totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {productsData && productsData.products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No products found matching your criteria</p>
          <button 
            onClick={() => setFilters({
              page: 1,
              limit: 12,
              countryCode: selectedCountry?.code,
              sortBy: 'createdAt',
              sortOrder: 'desc',
            })}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}