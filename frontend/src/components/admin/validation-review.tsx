'use client'

import { useState } from 'react'
import { useApproveValidationMutation, useRejectValidationMutation } from '@/store/api'
import ContentComparison from './content-comparison'
import FeedbackForm from './feedback-form'

interface ValidationReviewProps {
  validation: any
  onApprove: () => void
  onReject: () => void
}

export default function ValidationReview({ validation, onApprove, onReject }: ValidationReviewProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [edits, setEdits] = useState<any>({})
  const [notes, setNotes] = useState('')

  const [approveValidation, { isLoading: isApproving }] = useApproveValidationMutation()
  const [rejectValidation, { isLoading: isRejecting }] = useRejectValidationMutation()

  const handleApprove = async () => {
    try {
      await approveValidation({
        id: validation.id,
        edits: Object.keys(edits).length > 0 ? edits : undefined,
        notes: notes || undefined,
      }).unwrap()
      onApprove()
    } catch (error) {
      console.error('Approval failed:', error)
    }
  }

  const handleReject = async (feedback: any) => {
    try {
      await rejectValidation({
        id: validation.id,
        feedback,
        notes: notes || undefined,
      }).unwrap()
      onReject()
    } catch (error) {
      console.error('Rejection failed:', error)
    }
  }

  const handleFieldEdit = (field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Validation Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Confidence Score</h3>
            <div className="mt-1 flex items-center">
              <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                <div
                  className={`h-2 rounded-full ${
                    validation.confidenceScore >= 80 ? 'bg-green-500' :
                    validation.confidenceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${validation.confidenceScore}%` }}
                ></div>
              </div>
              <span className={`text-lg font-semibold ${getConfidenceColor(validation.confidenceScore)}`}>
                {validation.confidenceScore}%
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Priority</h3>
            <span className={`mt-1 inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getPriorityColor(validation.priority)}`}>
              {validation.priority}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Processing Time</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ~{validation.estimatedProcessingTime} min
            </p>
          </div>
        </div>

        {/* Suggested Actions */}
        {validation.suggestedActions && validation.suggestedActions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Suggested Actions</h3>
            <div className="space-y-2">
              {validation.suggestedActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {action.type} Product
                    </span>
                    <p className="text-xs text-gray-500">{action.reasoning}</p>
                  </div>
                  <span className="text-sm text-gray-600">{action.confidence}% confidence</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Comparison */}
      <ContentComparison
        originalContent={validation.originalContent}
        extractedData={validation.extractedProduct}
        confidenceScores={{}} // Would need to be calculated per field
        onFieldEdit={handleFieldEdit}
        editable={true}
      />

      {/* Notes Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes about this validation..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isRejecting}
            className="px-6 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Approving...
              </>
            ) : (
              'Approve & Create Product'
            )}
          </button>
        </div>
      </div>

      {/* Related Validations */}
      {validation.relatedValidations && validation.relatedValidations.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Related Validations</h3>
          <p className="text-sm text-gray-600 mb-2">
            This submission contains {validation.relatedValidations.length} other product{validation.relatedValidations.length !== 1 ? 's' : ''}:
          </p>
          <div className="space-y-2">
            {validation.relatedValidations.map((relatedId) => (
              <div key={relatedId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Validation {relatedId}</span>
                <a
                  href={`/admin/validations/${relatedId}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Review
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Feedback Form Modal */}
      {showRejectForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reject Validation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide feedback for rejecting this validation:
              </p>
              <FeedbackForm
                onSubmit={handleReject}
                onCancel={() => setShowRejectForm(false)}
                isLoading={isRejecting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}