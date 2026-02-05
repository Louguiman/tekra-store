'use client'

import { useGetValidationStatsQuery, useGetFeedbackCategoriesQuery } from '@/store/api'

export default function FeedbackAnalytics() {
  const { data: stats, isLoading: statsLoading } = useGetValidationStatsQuery()
  const { data: categories, isLoading: categoriesLoading } = useGetFeedbackCategoriesQuery()

  if (statsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approval Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.approvalRate || 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Processing Time</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.avgProcessingTime || 0} min</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalPending || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High Priority</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.highPriority || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common Rejection Reasons */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Common Rejection Reasons</h3>
          <p className="text-sm text-gray-600">
            Most frequent reasons for validation rejections
          </p>
        </div>
        <div className="p-6">
          {stats?.commonRejectionReasons && stats.commonRejectionReasons.length > 0 ? (
            <div className="space-y-4">
              {stats.commonRejectionReasons.map((reason, index) => {
                const total = stats.commonRejectionReasons.reduce((sum, r) => sum + r.count, 0)
                const percentage = total > 0 ? (reason.count / total) * 100 : 0

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{reason.reason}</span>
                      <span className="text-sm text-gray-500">
                        {reason.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No rejection data available yet.</p>
          )}
        </div>
      </div>

      {/* Feedback Categories Reference */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Feedback Categories</h3>
          <p className="text-sm text-gray-600">
            Available feedback categories for validation rejections
          </p>
        </div>
        <div className="p-6">
          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">{category.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Subcategories:</p>
                      <div className="flex flex-wrap gap-2">
                        {category.subcategories.map((subcategory) => (
                          <span
                            key={subcategory}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No feedback categories available.</p>
          )}
        </div>
      </div>

      {/* AI Improvement Recommendations */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">AI Improvement Recommendations</h3>
          <p className="text-sm text-gray-600">
            Suggested improvements based on validation feedback
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Improve OCR Accuracy</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Consider training the OCR model on more product images to improve text extraction accuracy.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Enhance Category Detection</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Add more training examples for product categorization to reduce manual corrections.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-900">Supplier-Specific Templates</h4>
                <p className="text-sm text-green-700 mt-1">
                  Create custom extraction templates for high-volume suppliers to improve accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}