'use client'

import { useState } from 'react'
import { ProductFilters, ProductSegment, RefurbishedGrade, useGetCategoriesQuery } from '@/store/api'

interface ProductFiltersComponentProps {
  filters: ProductFilters
  onFiltersChange: (filters: Partial<ProductFilters>) => void
  segment?: ProductSegment
}

export function ProductFiltersComponent({ 
  filters, 
  onFiltersChange, 
  segment 
}: ProductFiltersComponentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: categories } = useGetCategoriesQuery()

  const handlePriceRangeChange = (min: string, max: string) => {
    onFiltersChange({
      minPrice: min ? parseFloat(min) : undefined,
      maxPrice: max ? parseFloat(max) : undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      brand: undefined,
      isRefurbished: undefined,
      refurbishedGrade: undefined,
      inStock: undefined,
    })
  }

  const hasActiveFilters = !!(
    filters.categoryId ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.brand ||
    filters.isRefurbished !== undefined ||
    filters.refurbishedGrade ||
    filters.inStock !== undefined
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium">Filters</span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Filters Content */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          {!segment && categories && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.categoryId || ''}
                onChange={(e) => onFiltersChange({ categoryId: e.target.value || undefined })}
                className="input-field"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (FCFA)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => handlePriceRangeChange(e.target.value, filters.maxPrice?.toString() || '')}
                className="input-field text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => handlePriceRangeChange(filters.minPrice?.toString() || '', e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              placeholder="Enter brand name"
              value={filters.brand || ''}
              onChange={(e) => onFiltersChange({ brand: e.target.value || undefined })}
              className="input-field"
            />
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={filters.isRefurbished === undefined ? '' : filters.isRefurbished ? 'refurbished' : 'new'}
              onChange={(e) => {
                const value = e.target.value
                onFiltersChange({
                  isRefurbished: value === '' ? undefined : value === 'refurbished',
                  refurbishedGrade: value !== 'refurbished' ? undefined : filters.refurbishedGrade,
                })
              }}
              className="input-field"
            >
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>

          {/* Refurbished Grade (only show if refurbished is selected) */}
          {filters.isRefurbished && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refurbished Grade
              </label>
              <select
                value={filters.refurbishedGrade || ''}
                onChange={(e) => onFiltersChange({ 
                  refurbishedGrade: e.target.value as RefurbishedGrade || undefined 
                })}
                className="input-field"
              >
                <option value="">All Grades</option>
                <option value={RefurbishedGrade.A}>Grade A (Excellent)</option>
                <option value={RefurbishedGrade.B}>Grade B (Good)</option>
                <option value={RefurbishedGrade.C}>Grade C (Fair)</option>
              </select>
            </div>
          )}

          {/* Stock Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability
            </label>
            <select
              value={filters.inStock === undefined ? '' : filters.inStock ? 'in-stock' : 'out-of-stock'}
              onChange={(e) => {
                const value = e.target.value
                onFiltersChange({
                  inStock: value === '' ? undefined : value === 'in-stock',
                })
              }}
              className="input-field"
            >
              <option value="">All Products</option>
              <option value="in-stock">In Stock Only</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}