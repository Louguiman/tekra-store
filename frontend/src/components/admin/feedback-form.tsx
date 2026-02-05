'use client'

import { useState, useEffect } from 'react'
import { useGetFeedbackCategoriesQuery } from '@/store/api'

interface FeedbackFormProps {
  onSubmit: (feedback: any) => void
  onCancel: () => void
  initialFeedback?: Partial<any>
  isLoading?: boolean
}

export default function FeedbackForm({ 
  onSubmit, 
  onCancel, 
  initialFeedback,
  isLoading = false 
}: FeedbackFormProps) {
  const [feedback, setFeedback] = useState({
    category: initialFeedback?.category || '',
    subcategory: initialFeedback?.subcategory || '',
    description: initialFeedback?.description || '',
    severity: initialFeedback?.severity || 'medium',
    suggestedImprovement: initialFeedback?.suggestedImprovement || '',
  })

  const { data: categories, isLoading: categoriesLoading } = useGetFeedbackCategoriesQuery()

  const selectedCategory = categories?.find(cat => cat.id === feedback.category)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (feedback.category && feedback.description) {
      onSubmit(feedback)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value,
      // Reset subcategory when category changes
      ...(field === 'category' ? { subcategory: '' } : {})
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Feedback Category *
        </label>
        <select
          value={feedback.category}
          onChange={(e) => handleChange('category', e.target.value)}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          disabled={categoriesLoading}
        >
          <option value="">Select a category</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {selectedCategory && (
          <p className="mt-1 text-xs text-gray-500">{selectedCategory.description}</p>
        )}
      </div>

      {/* Subcategory Selection */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory
          </label>
          <select
            value={feedback.subcategory}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a subcategory</option>
            {selectedCategory.subcategories.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Severity Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Severity *
        </label>
        <select
          value={feedback.severity}
          onChange={(e) => handleChange('severity', e.target.value)}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          value={feedback.description}
          onChange={(e) => handleChange('description', e.target.value)}
          required
          rows={3}
          maxLength={1000}
          placeholder="Describe the issue or reason for rejection..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.description.length}/1000 characters
        </p>
      </div>

      {/* Suggested Improvement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Suggested Improvement
        </label>
        <textarea
          value={feedback.suggestedImprovement}
          onChange={(e) => handleChange('suggestedImprovement', e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="How can this be improved in the future?"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.suggestedImprovement.length}/500 characters
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !feedback.category || !feedback.description}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </form>
  )
}