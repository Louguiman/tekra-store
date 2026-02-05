'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TemplateForm, { TemplateFormData, TemplateField } from '@/components/admin/template-form';

interface Template extends TemplateFormData {
  id: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    isActive: '',
    search: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, [filters]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.isActive) queryParams.append('isActive', filters.isActive);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to delete template');
      
      await fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${template.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify({ isActive: !template.isActive }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to update template');
      
      await fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleCreateTemplate = async (formData: TemplateFormData) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Failed to create template');

      await fetchTemplates();
      setShowCreateModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create template');
      throw err;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supplier Templates</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/templates/analytics')}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
          >
            View Analytics
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search templates..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="pdf">PDF</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="computers">Computers</option>
              <option value="phones">Phones</option>
              <option value="accessories">Accessories</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No templates found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-600">v{template.version}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    template.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {template.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {template.type}
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  {template.category}
                </span>
                {template.isGlobal && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Global
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <p>{template.fields.length} fields</p>
                <p className="text-xs">
                  Updated: {new Date(template.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/templates/${template.id}`)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  View
                </button>
                <button
                  onClick={() => handleToggleActive(template)}
                  className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  {template.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-100 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Template</h2>
            <TemplateForm
              onSubmit={handleCreateTemplate}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
