'use client'

import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'
import ValidationReview from '@/components/admin/validation-review'
import { useGetValidationByIdQuery } from '@/store/api'

export default function ValidationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const validationId = params.id as string

  const { data: validation, isLoading, error } = useGetValidationByIdQuery(validationId)

  const handleBack = () => {
    router.push('/admin/validations')
  }

  const handleApprove = () => {
    // Refresh and go back to queue
    router.push('/admin/validations')
  }

  const handleReject = () => {
    // Refresh and go back to queue
    router.push('/admin/validations')
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !validation) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">
            Error loading validation item. Please try again later.
          </div>
          <button
            onClick={handleBack}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Back to Queue
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Validation</h1>
              <p className="text-sm text-gray-600">
                Supplier: {validation.supplierName} • 
                Confidence: {validation.confidenceScore}% • 
                Priority: {validation.priority}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Review Component */}
        <ValidationReview
          validation={validation}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </AdminLayout>
  )
}