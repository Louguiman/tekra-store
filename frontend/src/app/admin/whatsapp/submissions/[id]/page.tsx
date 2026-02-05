'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface SubmissionDetail {
  id: string;
  whatsappMessageId: string;
  contentType: 'text' | 'image' | 'pdf' | 'voice';
  originalContent: string;
  mediaUrl: string | null;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  validationStatus: 'pending' | 'approved' | 'rejected';
  extractedData: any[];
  supplier: {
    id: string;
    name: string;
    phoneNumber: string;
    performanceMetrics: {
      totalSubmissions: number;
      approvedSubmissions: number;
      averageConfidenceScore: number;
      qualityRating: number;
    };
  };
  processingLogs: Array<{
    id: string;
    processingStage: string;
    processingStatus: string;
    processingTimeMs: number;
    errorMessage?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function SubmissionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSubmission();
    }
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/submissions/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch submission');

      const data = await res.json();
      setSubmission(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!confirm('Trigger processing for this submission?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/submissions/${id}/process`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to trigger processing');

      alert('Processing triggered successfully');
      fetchSubmission();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger processing');
    }
  };

  const handleReprocess = async () => {
    if (!confirm('Reprocess this failed submission? This will reset and retry.')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/whatsapp/submissions/${id}/reprocess`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to reprocess submission');

      alert('Reprocessing triggered successfully');
      fetchSubmission();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reprocess submission');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error || 'Submission not found'}</p>
          <Link
            href="/admin/whatsapp/submissions"
            className="mt-2 inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submission Details</h1>
          <p className="text-gray-600 mt-1">ID: {submission.id}</p>
        </div>
        <div className="space-x-2">
          {submission.processingStatus === 'pending' && (
            <button
              onClick={handleProcess}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Process Now
            </button>
          )}
          {submission.processingStatus === 'failed' && (
            <button
              onClick={handleReprocess}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Reprocess
            </button>
          )}
          <Link
            href="/admin/whatsapp/submissions"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-lg font-medium">{submission.supplier.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="text-lg font-medium">{submission.supplier.phoneNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Submissions</p>
            <p className="text-lg font-medium">{submission.supplier.performanceMetrics.totalSubmissions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approval Rate</p>
            <p className="text-lg font-medium">
              {((submission.supplier.performanceMetrics.approvedSubmissions / 
                submission.supplier.performanceMetrics.totalSubmissions) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quality Rating</p>
            <p className="text-lg font-medium">
              {submission.supplier.performanceMetrics.qualityRating.toFixed(1)} / 5.0
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Confidence</p>
            <p className="text-lg font-medium">
              {submission.supplier.performanceMetrics.averageConfidenceScore.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Submission Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Processing Status</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-medium capitalize">{submission.processingStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Content Type</p>
              <p className="text-lg font-medium capitalize">{submission.contentType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-medium">{new Date(submission.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Updated</p>
              <p className="text-lg font-medium">{new Date(submission.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Validation Status</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-medium capitalize">{submission.validationStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Extracted Products</p>
              <p className="text-lg font-medium">
                {submission.extractedData ? submission.extractedData.length : 0}
              </p>
            </div>
            {submission.extractedData && submission.extractedData.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-lg font-medium">
                  {(submission.extractedData.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / 
                    submission.extractedData.length).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Original Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Original Content</h2>
        <div className="bg-gray-50 rounded p-4">
          <pre className="whitespace-pre-wrap text-sm">{submission.originalContent}</pre>
        </div>
        {submission.mediaUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Media URL:</p>
            <a
              href={submission.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {submission.mediaUrl}
            </a>
          </div>
        )}
      </div>

      {/* Extracted Data */}
      {submission.extractedData && submission.extractedData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Extracted Products</h2>
          <div className="space-y-4">
            {submission.extractedData.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Product Name</p>
                    <p className="font-medium">{product.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Brand</p>
                    <p className="font-medium">{product.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{product.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="font-medium capitalize">{product.condition || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-medium">
                      {product.price ? `${product.currency || ''} ${product.price}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-medium">{product.quantity || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Confidence Score</p>
                    <p className="font-medium">{product.confidenceScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Model</p>
                    <p className="font-medium">{product.extractionMetadata?.aiModel || 'N/A'}</p>
                  </div>
                </div>
                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Specifications</p>
                    <div className="bg-gray-50 rounded p-3">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1">
                          <span className="text-sm text-gray-600">{key}:</span>
                          <span className="text-sm font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Logs */}
      {submission.processingLogs && submission.processingLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Processing Logs</h2>
          <div className="space-y-2">
            {submission.processingLogs.map((log) => (
              <div
                key={log.id}
                className={`border-l-4 p-4 ${
                  log.processingStatus === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : log.processingStatus === 'failed'
                    ? 'border-red-500 bg-red-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium capitalize">{log.processingStage.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="capitalize">{log.processingStatus}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Processing Time: {log.processingTimeMs}ms
                    </p>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">Error: {log.errorMessage}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
