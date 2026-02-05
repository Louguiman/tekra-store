'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TemplateForm, { TemplateFormData } from '@/components/admin/template-form';
import TemplateValidator from '@/components/admin/template-validator';
import TemplateImprovements from '@/components/admin/template-improvements';

interface Template extends TemplateFormData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  usageStats?: {
    totalUsages: number;
    successfulSubmissions: number;
    averageConfidenceScore: number;
    lastUsedDate: string;
    commonErrors: Array<{ field: string; errorType: string; count: number }>;
  };
}

interface TemplateAnalytics {
  template: Template;
  usageStats: Template['usageStats'];
  recentSubmissions: any[];
  successRate: number;
  averageProcessingTime: number;
  commonIssues: Array<{ issue: string; count: number; suggestion: string }>;
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'analytics' | 'validator' | 'improvements' | 'edit'>('details');

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchAnalytics();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch template');

      const data = await response.json();
      setTemplate(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const handleUpdate = async (formData: TemplateFormData) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Failed to update template');

      await fetchTemplate();
      setIsEditing(false);
      setActiveTab('details');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update template');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete template');

      router.push('/admin/templates');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleClone = async () => {
    const supplierId = prompt('Enter supplier ID for the cloned template (leave empty for global):');
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}/clone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify({
            supplierId: supplierId || undefined,
            customizations: {
              name: `${template?.name} (Copy)`,
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to clone template');

      const clonedTemplate = await response.json();
      router.push(`/admin/templates/${clonedTemplate.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clone template');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Template not found'}
        </div>
        <button
          onClick={() => router.push('/admin/templates')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          ← Back to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/templates')}
          className="text-blue-600 hover:text-blue-700 mb-4"
        >
          ← Back to Templates
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <p className="text-gray-600 mt-1">Version {template.version}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClone}
              className="border px-4 py-2 rounded hover:bg-gray-50"
            >
              Clone
            </button>
            <button
              onClick={() => {
                setIsEditing(true);
                setActiveTab('edit');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="border border-red-300 text-red-600 px-4 py-2 rounded hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-1 ${
              activeTab === 'details'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-2 px-1 ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('improvements')}
            className={`pb-2 px-1 ${
              activeTab === 'improvements'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Improvements
          </button>
          <button
            onClick={() => setActiveTab('validator')}
            className={`pb-2 px-1 ${
              activeTab === 'validator'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Test Validator
          </button>
          {isEditing && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`pb-2 px-1 ${
                activeTab === 'edit'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">Description</dt>
                <dd className="mt-1">{template.description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Type</dt>
                <dd className="mt-1 capitalize">{template.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Category</dt>
                <dd className="mt-1 capitalize">{template.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Scope</dt>
                <dd className="mt-1">{template.isGlobal ? 'Global' : 'Supplier-Specific'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Created</dt>
                <dd className="mt-1">{new Date(template.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Last Updated</dt>
                <dd className="mt-1">{new Date(template.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>

            {template.tags.length > 0 && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-600 mb-2">Tags</dt>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Template Fields ({template.fields.length})</h3>
            <div className="space-y-3">
              {template.fields.map((field, idx) => (
                <div key={idx} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{field.label}</h4>
                      <p className="text-sm text-gray-600">{field.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>

                  {field.placeholder && (
                    <p className="text-sm text-gray-600 mb-2">
                      Placeholder: {field.placeholder}
                    </p>
                  )}

                  {field.options && field.options.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Options:</span> {field.options.join(', ')}
                    </div>
                  )}

                  {field.validation && Object.keys(field.validation).length > 0 && (
                    <div className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Validation:</span>{' '}
                      {JSON.stringify(field.validation)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Example Content */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Example Content</h3>
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm font-mono">
              {template.exampleContent}
            </pre>
          </div>

          {/* Instructions */}
          {template.instructions && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <p className="whitespace-pre-wrap">{template.instructions}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Uses</div>
              <div className="text-2xl font-bold mt-1">
                {analytics.usageStats?.totalUsages || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-2xl font-bold mt-1">
                {(analytics.successRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Confidence</div>
              <div className="text-2xl font-bold mt-1">
                {analytics.usageStats?.averageConfidenceScore.toFixed(1) || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Processing Time</div>
              <div className="text-2xl font-bold mt-1">
                {(analytics.averageProcessingTime / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Common Issues */}
          {analytics.commonIssues.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Common Issues & Suggestions</h3>
              <div className="space-y-4">
                {analytics.commonIssues.map((issue, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-400 pl-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium">{issue.issue}</h4>
                      <span className="text-sm text-gray-600">{issue.count} occurrences</span>
                    </div>
                    <p className="text-sm text-gray-700">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Submissions */}
          {analytics.recentSubmissions.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>
              <div className="space-y-2">
                {analytics.recentSubmissions.slice(0, 10).map((submission: any) => (
                  <div key={submission.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{submission.supplier?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(submission.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        submission.result === 'success'
                          ? 'bg-green-100 text-green-800'
                          : submission.result === 'partial_success'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {submission.result}
                      </span>
                      <span className="text-sm text-gray-600">
                        {submission.confidenceScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'validator' && (
        <TemplateValidator
          templateId={templateId}
          templateFields={template.fields}
        />
      )}

      {activeTab === 'improvements' && (
        <TemplateImprovements
          templateId={templateId}
          onImprovementApplied={() => {
            fetchTemplate();
            fetchAnalytics();
          }}
        />
      )}

      {activeTab === 'edit' && isEditing && (
        <TemplateForm
          initialData={template}
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditing(false);
            setActiveTab('details');
          }}
          isEditing={true}
        />
      )}
    </div>
  );
}
