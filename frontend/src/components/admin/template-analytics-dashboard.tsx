'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TemplateAnalysisSummary {
  templateId: string;
  templateName: string;
  totalSubmissions: number;
  successRate: number;
  overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  improvementsCount: number;
}

export default function TemplateAnalyticsDashboard() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<TemplateAnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'health' | 'submissions' | 'successRate'>('health');

  useEffect(() => {
    fetchAllAnalyses();
  }, []);

  const fetchAllAnalyses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/analysis/all`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch analyses');

      const data = await response.json();
      setAnalyses(data.map((analysis: any) => ({
        templateId: analysis.templateId,
        templateName: analysis.templateName,
        totalSubmissions: analysis.totalSubmissions,
        successRate: analysis.successRate,
        overallHealth: analysis.overallHealth,
        improvementsCount: analysis.improvements.length,
      })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_improvement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthScore = (health: string) => {
    switch (health) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'needs_improvement': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  };

  const sortedAnalyses = [...analyses].sort((a, b) => {
    switch (sortBy) {
      case 'health':
        return getHealthScore(a.overallHealth) - getHealthScore(b.overallHealth);
      case 'submissions':
        return b.totalSubmissions - a.totalSubmissions;
      case 'successRate':
        return a.successRate - b.successRate;
      default:
        return 0;
    }
  });

  const stats = {
    total: analyses.length,
    excellent: analyses.filter(a => a.overallHealth === 'excellent').length,
    good: analyses.filter(a => a.overallHealth === 'good').length,
    needsImprovement: analyses.filter(a => a.overallHealth === 'needs_improvement').length,
    poor: analyses.filter(a => a.overallHealth === 'poor').length,
    totalImprovements: analyses.reduce((sum, a) => sum + a.improvementsCount, 0),
    avgSuccessRate: analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.successRate, 0) / analyses.length
      : 0,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Analyzing all templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Templates</div>
          <div className="text-3xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Success Rate</div>
          <div className="text-3xl font-bold mt-1">
            {(stats.avgSuccessRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Improvements</div>
          <div className="text-3xl font-bold mt-1">{stats.totalImprovements}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Needs Attention</div>
          <div className="text-3xl font-bold mt-1 text-red-600">
            {stats.needsImprovement + stats.poor}
          </div>
        </div>
      </div>

      {/* Health Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Template Health Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.excellent}</div>
            <div className="text-sm text-gray-600">Excellent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.good}</div>
            <div className="text-sm text-gray-600">Good</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.needsImprovement}</div>
            <div className="text-sm text-gray-600">Needs Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.poor}</div>
            <div className="text-sm text-gray-600">Poor</div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Template Analysis</h3>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="health">Sort by Health</option>
              <option value="submissions">Sort by Submissions</option>
              <option value="successRate">Sort by Success Rate</option>
            </select>
            <button
              onClick={fetchAllAnalyses}
              className="border px-4 py-2 rounded hover:bg-gray-50 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {sortedAnalyses.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No templates to analyze
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAnalyses.map((analysis) => (
              <div
                key={analysis.templateId}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/templates/${analysis.templateId}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{analysis.templateName}</h4>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{analysis.totalSubmissions} submissions</span>
                      <span>{(analysis.successRate * 100).toFixed(1)}% success rate</span>
                      {analysis.improvementsCount > 0 && (
                        <span className="text-orange-600 font-medium">
                          {analysis.improvementsCount} improvement{analysis.improvementsCount !== 1 ? 's' : ''} suggested
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getHealthColor(analysis.overallHealth)}`}>
                      {analysis.overallHealth.replace('_', ' ')}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Items */}
      {(stats.needsImprovement + stats.poor) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-800">Action Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {stats.needsImprovement + stats.poor} template{(stats.needsImprovement + stats.poor) !== 1 ? 's need' : ' needs'} attention.
                Review the suggested improvements and apply them to improve template performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
