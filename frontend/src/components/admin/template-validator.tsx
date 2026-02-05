'use client';

import { useState } from 'react';

interface FieldValidationError {
  field: string;
  errorType: 'missing' | 'invalid_format' | 'out_of_range' | 'invalid_value';
  message: string;
  expectedFormat?: string;
  actualValue?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
  missingFields: string[];
  validFields: string[];
}

interface TemplateValidatorProps {
  templateId: string;
  templateFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'multiline';
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
}

export default function TemplateValidator({ templateId, templateFields }: TemplateValidatorProps) {
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  const handleFieldChange = (fieldName: string, value: any) => {
    setSubmissionData({
      ...submissionData,
      [fieldName]: value,
    });
    // Clear validation result when data changes
    setValidationResult(null);
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/templates/${templateId}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
          body: JSON.stringify({
            templateId,
            submissionData,
          }),
        }
      );

      if (!response.ok) throw new Error('Validation failed');

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleReset = () => {
    setSubmissionData({});
    setValidationResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Test Template Validation</h3>
        <p className="text-sm text-gray-600 mb-6">
          Fill in the fields below to test how the template validates supplier submissions.
        </p>

        <div className="space-y-4">
          {templateFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'text' && (
                <input
                  type="text"
                  value={submissionData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border rounded px-3 py-2"
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  value={submissionData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border rounded px-3 py-2"
                />
              )}

              {field.type === 'multiline' && (
                <textarea
                  value={submissionData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              )}

              {field.type === 'select' && (
                <select
                  value={submissionData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select an option...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <button
            onClick={handleReset}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Validation Results</h3>

          <div className={`p-4 rounded mb-4 ${
            validationResult.isValid
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">Validation Passed</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-red-800">Validation Failed</span>
                </>
              )}
            </div>
          </div>

          {/* Valid Fields */}
          {validationResult.validFields.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-green-700 mb-2">
                Valid Fields ({validationResult.validFields.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {validationResult.validFields.map((field) => (
                  <span key={field} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {validationResult.missingFields.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-700 mb-2">
                Missing Required Fields ({validationResult.missingFields.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {validationResult.missingFields.map((field) => (
                  <span key={field} className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2">
                Validation Errors ({validationResult.errors.length})
              </h4>
              <div className="space-y-2">
                {validationResult.errors.map((error, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-medium text-red-800">{error.field}</div>
                    <div className="text-sm text-red-700">{error.message}</div>
                    {error.expectedFormat && (
                      <div className="text-xs text-red-600 mt-1">
                        Expected format: {error.expectedFormat}
                      </div>
                    )}
                    {error.actualValue && (
                      <div className="text-xs text-red-600 mt-1">
                        Actual value: {error.actualValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
