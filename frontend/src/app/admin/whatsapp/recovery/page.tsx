'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FailedOperation {
  id: string;
  operationType: string;
  submissionId: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  metadata: any;
  createdAt: string;
}

interface RecoveryStats {
  totalFailed: number;
  byOperationType: Record<string, number>;
  retryingNow: number;
  permanentlyFailed: number;
  averageRetryTime: number;
}

export default function RecoveryQueuePage() {
  const router = useRouter();
  const [operations, setOperations] = useState<FailedOperation[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const [queueRes, statsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/recovery/queue`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/recovery/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!queueRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [queueData, statsData] = await Promise.all([
        queueRes.json(),
        statsRes.json(),
      ]);

      setOperations(queueData.failedOperations || []);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (submissionId: string) => {
    if (!confirm('Retry this failed operation?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/recovery/retry/${submissionId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to retry operation');

      const result = await res.json();
      alert(`Retry completed in ${result.totalTime}ms after ${result.attempts} attempts`);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry operation');
    }
  };

  const getOperationTypeColor = (type: string) => {
    switch (type) {
      case 'webhook':
        return 'bg-blue-100 text-blue-800';
      case 'ai_extraction':
        return 'bg-purple-100 text-purple-800';
      case 'validation':
        return 'bg-yellow-100 text-yellow-800';
      case 'inventory_update':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recovery queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recovery Queue</h1>
          <p className="text-gray-600 mt-1">Manage failed operations and retries</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={fetchData}
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

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold text-gray-900">{stats.totalFailed}</p>
            <p className="text-sm text-gray-600 mt-1">Total Failed</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold text-blue-600">{stats.retryingNow}</p>
            <p className="text-sm text-gray-600 mt-1">Retrying Now</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold text-red-600">{stats.permanentlyFailed}</p>
            <p className="text-sm text-gray-600 mt-1">Permanent Failures</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold text-gray-900">{stats.averageRetryTime}ms</p>
            <p className="text-sm text-gray-600 mt-1">Avg Retry Time</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">By Type</p>
            <div className="space-y-1 text-xs">
              {Object.entries(stats.byOperationType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Operations List */}
      {operations.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-green-800">Recovery Queue Empty</h3>
          <p className="text-green-600 mt-2">No failed operations pending retry</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Retry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operations.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOperationTypeColor(op.operationType)}`}>
                        {op.operationType.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{op.error}</div>
                      {op.metadata && (
                        <div className="text-xs text-gray-500 mt-1">
                          Submission: {op.submissionId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {op.retryCount} / {op.maxRetries}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            op.retryCount >= op.maxRetries
                              ? 'bg-red-600'
                              : op.retryCount > op.maxRetries / 2
                              ? 'bg-yellow-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${(op.retryCount / op.maxRetries) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {op.retryCount < op.maxRetries ? (
                        <>
                          {new Date(op.nextRetryAt).toLocaleTimeString()}
                          <div className="text-xs text-gray-400">
                            {Math.round((new Date(op.nextRetryAt).getTime() - Date.now()) / 1000)}s
                          </div>
                        </>
                      ) : (
                        <span className="text-red-600 font-medium">Max retries reached</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(op.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleRetry(op.submissionId)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Retry Now
                      </button>
                      <Link
                        href={`/admin/whatsapp/submissions/${op.submissionId}`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
