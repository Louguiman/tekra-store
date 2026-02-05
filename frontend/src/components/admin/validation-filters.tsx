'use client'

import { useState } from 'react'

interface ValidationFilters {
  supplierId?: string
  contentType?: 'text' | 'image' | 'pdf' | 'voice'
  priority?: 'low' | 'medium' | 'high'
  category?: string
  minConfidence?: number
  maxConfidence?: number
  page?: number
  limit?: number
}

interface ValidationFiltersProps {
  filters: ValidationFilters
  onFiltersChange: (filters: ValidationFilters) => void
}

export default function ValidationFilters({ filters, onFiltersChange }: ValidationFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleFilterChange = (key: keyof ValidationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = { page: 1, limit: 20 }
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Content Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Type
          </label>
          <select
            value={localFilters.contentType || ''}
            onChange={(e) => handleFilterChange('contentType', e.target.value || undefined)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
            <option value="voice">Voice</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={localFilters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Min Confidence Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Confidence
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={localFilters.minConfidence || ''}
            onChange={(e) => handleFilterChange('minConfidence', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Max Confidence Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Confidence
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={localFilters.maxConfidence || ''}
            onChange={(e) => handleFilterChange('maxConfidence', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="100"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {Object.keys(localFilters).some(key => key !== 'page' && key !== 'limit' && localFilters[key as keyof ValidationFilters]) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {localFilters.contentType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Type: {localFilters.contentType}
              <button
                onClick={() => handleFilterChange('contentType', undefined)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.priority && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Priority: {localFilters.priority}
              <button
                onClick={() => handleFilterChange('priority', undefined)}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.minConfidence && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Min: {localFilters.minConfidence}%
              <button
                onClick={() => handleFilterChange('minConfidence', undefined)}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.maxConfidence && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Max: {localFilters.maxConfidence}%
              <button
                onClick={() => handleFilterChange('maxConfidence', undefined)}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}