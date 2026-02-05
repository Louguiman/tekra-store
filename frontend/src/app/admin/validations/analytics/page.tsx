'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/admin-layout'
import FeedbackAnalytics from '@/components/admin/feedback-analytics'
import Link from 'next/link'

export default function ValidationAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validation Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track validation performance and common rejection reasons
            </p>
          </div>
          <Link
            href="/admin/validations"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Back to Queue
          </Link>
        </div>

        {/* Feedback Analytics */}
        <FeedbackAnalytics />
      </div>
    </AdminLayout>
  )
}