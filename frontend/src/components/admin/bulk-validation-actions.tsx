'use client'

import { useState } from 'react'
import { useBulkApproveValidationsMutation, useBulkRejectValidationsMutation } from '@/store/api'
import FeedbackForm from './feedback-form'

interface BulkValidationActionsProps {
  selectedIds: string[]
  onBulkAction: () => void
  onClearSelection: () => void
  disabled?: boolean
}

export default function BulkValidationActions({ 
  selectedIds, 
  onBulkAction, 
  onClearSelection,
  disabled = false 
}: BulkValidationActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [bulkApprove, { isLoading: isApproving }] = useBulkApproveValidationsMutation()
  const [bulkReject, { isLoading: isRejecting }] = useBulkRejectValidationsMutation()

  const handleBulkApprove = async () => {
    try {
      await bulkApprove({
        validationIds: selectedIds,
        notes: 'Bulk approval',
      }).unwrap()
      onBulkAction()
    } catch (error) {
      console.error('Bulk approval failed:', error)
    }
  }

  const handleBulkReject = async (feedback: any) => {
    try {
      await bulkReject({
        validationIds: selectedIds,
        feedback,
        notes: 'Bulk rejection',
      }).unwrap()
      setShowRejectForm(false)
      onBulkAction()
    } catch (error) {
      console.error('Bulk rejection failed:', error)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBulkApprove}
            disabled={disabled || isApproving || selectedIds.length === 0}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Approving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve All
              </>
            )}
          </button>

          <button
            onClick={() => setShowRejectForm(true)}
            disabled={disabled || isRejecting || selectedIds.length === 0}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject All
          </button>
        </div>
      </div>

      {/* Bulk Reject Feedback Form Modal */}
      {showRejectForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Bulk Reject Validations
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide feedback for rejecting {selectedIds.length} validation{selectedIds.length !== 1 ? 's' : ''}:
              </p>
              <FeedbackForm
                onSubmit={handleBulkReject}
                onCancel={() => setShowRejectForm(false)}
                isLoading={isRejecting}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}