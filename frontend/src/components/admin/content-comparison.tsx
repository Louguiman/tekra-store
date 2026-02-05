'use client'

import { useState } from 'react'

interface ContentComparisonProps {
  originalContent: {
    type: 'text' | 'image' | 'pdf' | 'voice'
    content: string
    mediaUrl?: string
  }
  extractedData: any
  confidenceScores: Record<string, number>
  onFieldEdit: (field: string, value: any) => void
  editable?: boolean
}

export default function ContentComparison({
  originalContent,
  extractedData,
  confidenceScores,
  onFieldEdit,
  editable = false
}: ContentComparisonProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})

  const handleStartEdit = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditValues({ [field]: currentValue })
  }

  const handleSaveEdit = (field: string) => {
    onFieldEdit(field, editValues[field])
    setEditingField(null)
    setEditValues({})
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValues({})
  }

  const renderOriginalContent = () => {
    switch (originalContent.type) {
      case 'image':
        return originalContent.mediaUrl ? (
          <div className="space-y-2">
            <img
              src={originalContent.mediaUrl}
              alt="Original content"
              className="max-w-full h-auto rounded-md border"
              style={{ maxHeight: '300px' }}
            />
            {originalContent.content && (
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                <strong>Caption:</strong> {originalContent.content}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 italic">Image not available</div>
        )

      case 'pdf':
        return (
          <div className="space-y-2">
            {originalContent.mediaUrl && (
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <a
                  href={originalContent.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  View PDF Document
                </a>
              </div>
            )}
            <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded max-h-60 overflow-y-auto">
              <strong>Extracted Text:</strong>
              <pre className="whitespace-pre-wrap mt-1">{originalContent.content}</pre>
            </div>
          </div>
        )

      case 'voice':
        return (
          <div className="space-y-2">
            {originalContent.mediaUrl && (
              <audio controls className="w-full">
                <source src={originalContent.mediaUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            )}
            <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
              <strong>Transcription:</strong>
              <p className="mt-1">{originalContent.content}</p>
            </div>
          </div>
        )

      default: // text
        return (
          <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{originalContent.content}</pre>
          </div>
        )
    }
  }

  const renderEditableField = (field: string, value: any, type: 'text' | 'number' | 'select' = 'text', options?: string[]) => {
    const isEditing = editingField === field
    const displayValue = editValues[field] !== undefined ? editValues[field] : value

    if (!editable) {
      return <span className="text-gray-900">{value || 'Not specified'}</span>
    }

    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          {type === 'select' && options ? (
            <select
              value={displayValue || ''}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select...</option>
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={displayValue || ''}
              onChange={(e) => setEditValues({ 
                ...editValues, 
                [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value 
              })}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          )}
          <button
            onClick={() => handleSaveEdit(field)}
            className="text-green-600 hover:text-green-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between">
        <span className="text-gray-900">{value || 'Not specified'}</span>
        <button
          onClick={() => handleStartEdit(field, value)}
          className="text-blue-600 hover:text-blue-800 ml-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Content Review</h3>
        <p className="text-sm text-gray-600">
          Compare original content with AI-extracted data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Original Content */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Original Content ({originalContent.type})
          </h4>
          {renderOriginalContent()}
        </div>

        {/* Extracted Data */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Extracted Product Data
            {editable && (
              <span className="ml-2 text-sm text-gray-500">(Click to edit)</span>
            )}
          </h4>
          
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Name</label>
              <div className="mt-1">
                {renderEditableField('name', extractedData.name)}
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand</label>
              <div className="mt-1">
                {renderEditableField('brand', extractedData.brand)}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <div className="mt-1">
                {renderEditableField('category', extractedData.category)}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <div className="mt-1">
                {renderEditableField('condition', extractedData.condition, 'select', ['new', 'used', 'refurbished'])}
              </div>
            </div>

            {/* Grade (for refurbished items) */}
            {extractedData.condition === 'refurbished' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade</label>
                <div className="mt-1">
                  {renderEditableField('grade', extractedData.grade, 'select', ['A', 'B', 'C', 'D'])}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <div className="mt-1">
                  {renderEditableField('price', extractedData.price, 'number')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <div className="mt-1">
                  {renderEditableField('currency', extractedData.currency, 'select', ['FCFA', 'USD', 'EUR'])}
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <div className="mt-1">
                {renderEditableField('quantity', extractedData.quantity, 'number')}
              </div>
            </div>

            {/* Specifications */}
            {extractedData.specifications && Object.keys(extractedData.specifications).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                <div className="space-y-2">
                  {Object.entries(extractedData.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">{key}:</span>
                      <span className="text-sm text-gray-900">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extraction Metadata */}
            {extractedData.extractionMetadata && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Extraction Info</label>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>AI Model: {extractedData.extractionMetadata.aiModel}</div>
                  <div>Processing Time: {extractedData.extractionMetadata.processingTime}ms</div>
                  <div>Extracted Fields: {extractedData.extractionMetadata.extractedFields?.join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}