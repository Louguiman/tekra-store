'use client';

import { useRouter } from 'next/navigation';
import TemplateAnalyticsDashboard from '@/components/admin/template-analytics-dashboard';

export default function TemplateAnalyticsPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/templates')}
          className="text-blue-600 hover:text-blue-700 mb-4"
        >
          ← Back to Templates
        </button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Template Analytics</h1>
            <p className="text-gray-600 mt-1">
              Analyze template performance and identify improvement opportunities
            </p>
          </div>
        </div>
      </div>

      <TemplateAnalyticsDashboard />
    </div>
  );
}
