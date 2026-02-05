'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PipelineStats {
  total: number;
  processing: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  validation: {
    pending: number;
    approved: number;
    rejected: number;
  };
  approvalRate: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    webhook: string;
    aiProcessing: string;
    validation: string;
    inventory: string;
  };
  metrics: {
    uptime: number;
    totalSubmissions: number;
    successRate: number;
    averageProcessingTime: number;
  };
}

interface RecentActivity {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'processing';
  supplierName: string;
  supplierId: string;
  message: string;
  processingStatus: string;
  validationStatus: string;
  confidence: number;
}

interface TopSupplier {
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number;
  avgConfidence: number;
  lastSubmission: string;
  status: 'excellent' | 'good' | 'needs-improvement';
}

interface AIMetrics {
  totalProcessed: number;
  avgConfidence: number;
  avgProcessingTime: number;
  highConfidenceRate: number;
  mediumConfidenceRate: number;
  lowConfidenceRate: number;
  confidenceDistribution: Array<{ range: string; count: number }>;
}

interface ValidationTrends {
  period: string;
  summary: {
    totalSubmissions: number;
    totalApproved: number;
    totalRejected: number;
    totalAutoApproved: number;
    approvalRate: number;
    autoApprovalRate: number;
  };
  trends: Array<{
    date: string;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  }>;
}

interface SystemAlert {
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: string;
  actionUrl: string;
}

interface SystemAlerts {
  alerts: SystemAlert[];
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
}

export default function WhatsAppPipelinePage() {
  const router = useRouter();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [validationTrends, setValidationTrends] = useState<ValidationTrends | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlerts | null>(null);
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

      const [
        statsRes,
        healthRes,
        activityRes,
        suppliersRes,
        aiMetricsRes,
        trendsRes,
        alertsRes,
      ] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/pipeline/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/health`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/dashboard/recent-activity?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/dashboard/top-suppliers?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/dashboard/ai-metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/dashboard/validation-trends?days=7`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/dashboard/system-alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [
        statsData,
        healthData,
        activityData,
        suppliersData,
        aiMetricsData,
        trendsData,
        alertsData,
      ] = await Promise.all([
        statsRes.json(),
        healthRes.json(),
        activityRes.json(),
        suppliersRes.json(),
        aiMetricsRes.json(),
        trendsRes.json(),
        alertsRes.json(),
      ]);

      setStats(statsData);
      setHealth(healthData);
      setRecentActivity(activityData);
      setTopSuppliers(suppliersData);
      setAIMetrics(aiMetricsData);
      setValidationTrends(trendsData);
      setSystemAlerts(alertsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSupplierStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Supplier Pipeline</h1>
          <p className="text-gray-600 mt-1">Monitor and manage supplier submissions</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* System Alerts */}
      {systemAlerts && systemAlerts.totalAlerts > 0 && (
        <div className="space-y-2">
          {systemAlerts.alerts.map((alert, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{alert.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
                <button
                  onClick={() => router.push(alert.actionUrl)}
                  className="ml-4 px-3 py-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 text-sm font-medium transition-colors"
                >
                  {alert.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Health Status */}
      {health && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-block px-4 py-2 rounded-full ${getStatusColor(health.status)}`}>
                {health.status.toUpperCase()}
              </div>
              <p className="text-sm text-gray-600 mt-2">Overall Status</p>
            </div>
            {Object.entries(health.services).map(([service, status]) => (
              <div key={service} className="text-center">
                <div className={`inline-block px-4 py-2 rounded-full ${getStatusColor(status)}`}>
                  {status.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-2 capitalize">{service}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold text-gray-900">{health.metrics.totalSubmissions}</p>
              <p className="text-sm text-gray-600">Total Submissions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{health.metrics.successRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{health.metrics.averageProcessingTime}ms</p>
              <p className="text-sm text-gray-600">Avg Processing Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Math.floor(health.metrics.uptime / 3600)}h</p>
              <p className="text-sm text-gray-600">Uptime</p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Processing Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <span className="text-xl font-bold text-yellow-600">{stats.processing.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">In Progress</span>
                <span className="text-xl font-bold text-blue-600">{stats.processing.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed</span>
                <span className="text-xl font-bold text-green-600">{stats.processing.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Failed</span>
                <span className="text-xl font-bold text-red-600">{stats.processing.failed}</span>
              </div>
            </div>
          </div>

          {/* Validation Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Validation Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <span className="text-xl font-bold text-yellow-600">{stats.validation.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Approved</span>
                <span className="text-xl font-bold text-green-600">{stats.validation.approved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rejected</span>
                <span className="text-xl font-bold text-red-600">{stats.validation.rejected}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600 font-semibold">Approval Rate</span>
                <span className="text-xl font-bold text-blue-600">{stats.approvalRate}</span>
              </div>
            </div>
          </div>

          {/* Total Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Overview</h3>
            <div className="space-y-3">
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-gray-600 mt-2">Total Submissions</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.processing.completed + stats.validation.approved}
                  </p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {stats.processing.failed + stats.validation.rejected}
                  </p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout for Activity and Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button
              onClick={() => router.push('/admin/whatsapp/submissions')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-4 border-gray-200 pl-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/whatsapp/submissions/${activity.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getActivityTypeColor(activity.type)}`}>
                          {activity.type.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{activity.supplierName}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.message}</p>
                      {activity.confidence > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Confidence: {(activity.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Suppliers</h3>
          <div className="space-y-4">
            {topSuppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No supplier data available</p>
            ) : (
              topSuppliers.map((supplier) => (
                <div key={supplier.supplierId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{supplier.supplierName}</h4>
                      <p className="text-sm text-gray-600">{supplier.supplierPhone}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSupplierStatusColor(supplier.status)}`}>
                      {supplier.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{supplier.totalSubmissions}</p>
                      <p className="text-xs text-gray-600">Submissions</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{supplier.approvalRate}%</p>
                      <p className="text-xs text-gray-600">Approval</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{(supplier.avgConfidence * 100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-600">Confidence</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Metrics and Validation Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Processing Metrics */}
        {aiMetrics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">AI Processing Metrics</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{aiMetrics.totalProcessed}</p>
                  <p className="text-sm text-gray-600">Total Processed</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">{(aiMetrics.avgConfidence * 100).toFixed(0)}%</p>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Confidence Distribution</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High (90-100%)</span>
                    <span className="text-sm font-semibold text-green-600">{aiMetrics.highConfidenceRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Medium (70-90%)</span>
                    <span className="text-sm font-semibold text-blue-600">{aiMetrics.mediumConfidenceRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low (&lt;70%)</span>
                    <span className="text-sm font-semibold text-yellow-600">{aiMetrics.lowConfidenceRate}%</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Processing Time</span>
                  <span className="text-sm font-semibold text-gray-900">{aiMetrics.avgProcessingTime}ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Trends */}
        {validationTrends && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Validation Trends ({validationTrends.period})</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-2xl font-bold text-green-600">{validationTrends.summary.approvalRate}%</p>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">{validationTrends.summary.autoApprovalRate}%</p>
                  <p className="text-sm text-gray-600">Auto-Approval</p>
                </div>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Submissions</span>
                  <span className="text-sm font-semibold text-gray-900">{validationTrends.summary.totalSubmissions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Approved</span>
                  <span className="text-sm font-semibold text-green-600">{validationTrends.summary.totalApproved}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <span className="text-sm font-semibold text-red-600">{validationTrends.summary.totalRejected}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Auto-Approved</span>
                  <span className="text-sm font-semibold text-blue-600">{validationTrends.summary.totalAutoApproved}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/admin/whatsapp/submissions')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="text-blue-600 text-3xl mb-2">📋</div>
          <h3 className="font-semibold text-gray-900">View Submissions</h3>
          <p className="text-sm text-gray-600 mt-1">Browse all supplier submissions</p>
        </button>

        <button
          onClick={() => router.push('/admin/validations')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="text-yellow-600 text-3xl mb-2">✓</div>
          <h3 className="font-semibold text-gray-900">Pending Validations</h3>
          <p className="text-sm text-gray-600 mt-1">Review items awaiting approval</p>
        </button>

        <button
          onClick={() => router.push('/admin/whatsapp/errors')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="text-red-600 text-3xl mb-2">⚠️</div>
          <h3 className="font-semibold text-gray-900">Error Management</h3>
          <p className="text-sm text-gray-600 mt-1">View and resolve errors</p>
        </button>

        <button
          onClick={() => router.push('/admin/whatsapp/recovery')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="text-orange-600 text-3xl mb-2">🔄</div>
          <h3 className="font-semibold text-gray-900">Recovery Queue</h3>
          <p className="text-sm text-gray-600 mt-1">Manage failed operations</p>
        </button>
      </div>
    </div>
  );
}
