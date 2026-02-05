'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/admin-layout'
import ValidationQueue from '@/components/admin/validation-queue'
import ValidationFilters from '@/components/admin/validation-filters'
import ValidationStats from '@/components/admin/validation-stats'
import { useGetValidationStatsQuery } from '@/store/api'

export interface ValidationFilters {
  supplierId?: string
  contentType?: 'text' | 'image' | 'pdf' | 'voice'
  priority?: 'low' | 'medium' | 'high'
  category?: string
  minConfidence?: number
  maxConfidence?: number
  page?: number
  limit?: number
}

export default function ValidationsPage() {
  const [filters, setFilters] = useState<ValidationFilters>({
    page: 1,
    limit: 20,
  })
  
  const { data: stats, isLoading: statsLoading } = useGetValidationStatsQuery()

  const handleFiltersChange = (newFilters: ValidationFilters) => {
    setFilters({ ...newFilters, page: 1 }) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validation Queue</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve supplier product submissions
            </p>
          </div>
          <Link
            href="/admin/validations/analytics"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            View Analytics
          </Link>
        </div>

        {/* Stats Overview */}
        {!statsLoading && stats && (
          <ValidationStats stats={stats} />
        )}

        {/* Filters */}
        <ValidationFilters 
          filters={filters} 
          onFiltersChange={handleFiltersChange} 
        />

        {/* Validation Queue */}
        <ValidationQueue 
          filters={filters}
          onPageChange={handlePageChange}
        />
      </div>
    </AdminLayout>
  )
}