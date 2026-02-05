'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CriticalError {
  id: string;
  errorType: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurrences: number;
  firstOccurrence: string;
  lastOccurrence: string;
  metadata: any;
  resolved: boolean;
}

export default function ErrorsPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<CriticalError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchErrors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/health/errors`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch errors');

      const data = await res.json();
      setErrors(data.errors || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (errorId: string) => {
    if (!confirm('Mark this error as resolved?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/health/errors/${errorId}/resolve`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to resolve error');

      alert('Error resolved successfully');
      fetchErrors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading errors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Error Management</h1>
          <p className="text-gray-600 mt-1">Monitor and resolve critical errors</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={fetchErrors}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
          <Link
            href="/admin/whatsapp"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-3xl font-bold text-gray-900">{errors.length}</p>
          <p className="text-sm text-gray-600 mt-1">Total Errors</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-3xl font-bold text-red-600">
            {errors.filter((e) => e.severity === 'critical').length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Critical</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-3xl font-bold text-orange-600">
            {errors.filter((e) => e.severity === 'high').length}
          </p>
          <p className="text-sm text-gray-600 mt-1">High Priority</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-3xl font-bold text-gray-900">
            {errors.reduce((sum, e) => sum + e.occurrences, 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total Occurrences</p>
        </div>
      </div>

      {/* Errors List */}
      {errors.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-green-800">No Unresolved Errors</h3>
          <p className="text-green-600 mt-2">All systems are operating normally</p>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.map((err) => (
            <div
              key={err.id}
              className={`border-2 rounded-lg p-6 ${getSeverityColor(err.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase">
                      {err.severity}
                    </span>
                    <span className="text-sm font-medium">{err.errorType}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{err.message}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Occurrences</p>
                      <p>{err.occurrences}</p>
                    </div>
                    <div>
                      <p className="font-medium">First Seen</p>
                      <p>{new Date(err.firstOccurrence).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Seen</p>
                      <p>{new Date(err.lastOccurrence).toLocaleString()}</p>
                    </div>
                  </div>
                  {err.metadata && Object.keys(err.metadata).length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-sm mb-2">Additional Details:</p>
                      <div className="bg-white bg-opacity-50 rounded p-3 text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(err.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleResolve(err.id)}
                  className="ml-4 px-4 py-2 bg-white border-2 border-current rounded-lg hover:bg-opacity-80 font-medium"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
