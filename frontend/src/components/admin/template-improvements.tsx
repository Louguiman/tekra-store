'use client';

import { useState, useEffect } from 'react';

interface TemplateImprovement {
  type: 'field_addition' | 'field_removal' | 'validation_adjustment' | 'instruction_clarification' | 'example_update';
  priority: 'low' | 'medium' | 'high';
  description: string;
  reasoning: string;
  suggestedChange: any;
  affectedField?: string;
  supportingData: {
    errorCount: number;
    errorRate: number;
    sampleErrors: string[];
  };
}

interface TemplateAnalysisResult {
  templateId: string;
  templateName: string;
  analysisDate: string;
  totalSubmissions: number;
  successRate: number;
  improvements: TemplateImprovement[];
  overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor';
}

interface TemplateImprovementsProps {
  templateId: string;
  onImprovementApplied?: () => void;
}

export default function TemplateImprovements({ templateId, onImprovementApplied }: TemplateImprovementsProps) {
  const [analysis, setAnalysis] = useState<TemplateAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [templateId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}/analysis`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch analysis');

      const data = await response.json();
      setAnalysis(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyImprovement = async (improvement: TemplateImprovement) => {
    if (!confirm(`Are you sure you want to apply this improvement?\n\n${improvement.description}`)) {
      return;
    }

    try {
      setApplying(improvement.description);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}/improvements/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify(improvement),
        }
      );

      if (!response.ok) throw new Error('Failed to apply improvement');

      await fetchAnalysis();
      if (onImprovementApplied) {
        onImprovementApplied();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply improvement');
    } finally {
      setApplying(null);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'field_addition':
        return 'Add Field';
      case 'field_removal':
        return 'Remove Field';
      case 'validation_adjustment':
        return 'Adjust Validation';
      case 'instruction_clarification':
        return 'Clarify Instructions';
      case 'example_update':
        return 'Update Example';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Analyzing template...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Failed to load analysis'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className={`p-6 rounded-lg border-2 ${getHealthColor(analysis.overallHealth)}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Template Health</h3>
            <p className="text-sm mt-1">
              Based on {analysis.totalSubmissions} submissions
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium capitalize">
            {analysis.overallHealth.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-2xl font-bold">
              {(analysis.successRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Improvements Found</div>
            <div className="text-2xl font-bold">
              {analysis.improvements.length}
            </div>
          </div>
        </div>
      </div>

      {/* Improvements List */}
      {analysis.improvements.length === 0 ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">No improvements needed!</span>
          </div>
          <p className="text-sm mt-1">This template is performing well.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Suggested Improvements</h3>
          
          {analysis.improvements.map((improvement, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${getPriorityColor(improvement.priority)}`}>
                      {improvement.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                      {getTypeLabel(improvement.type)}
                    </span>
                    {improvement.affectedField && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                        {improvement.affectedField}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-lg">{improvement.description}</h4>
                  <p className="text-gray-700 mt-2">{improvement.reasoning}</p>
                </div>
              </div>

              {/* Supporting Data */}
              <div className="bg-gray-50 rounded p-4 mb-4">
                <h5 className="font-medium text-sm mb-2">Supporting Data</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Error Count:</span>{' '}
                    <span className="font-medium">{improvement.supportingData.errorCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Error Rate:</span>{' '}
                    <span className="font-medium">
                      {(improvement.supportingData.errorRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggested Change */}
              <div className="bg-blue-50 rounded p-4 mb-4">
                <h5 className="font-medium text-sm mb-2">Suggested Change</h5>
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(improvement.suggestedChange, null, 2)}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApplyImprovement(improvement)}
                  disabled={applying === improvement.description}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {applying === improvement.description ? 'Applying...' : 'Apply Improvement'}
                </button>
                <button
                  className="border px-4 py-2 rounded hover:bg-gray-50 text-sm"
                  onClick={() => {
                    // In a real implementation, this would allow manual review
                    alert('Manual review feature coming soon');
                  }}
                >
                  Review Manually
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchAnalysis}
          className="border px-4 py-2 rounded hover:bg-gray-50 text-sm"
        >
          Refresh Analysis
        </button>
      </div>
    </div>
  );
}
