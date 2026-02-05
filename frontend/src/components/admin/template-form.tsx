'use client';

import { useState, useEffect } from 'react';

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiline';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface TemplateFormData {
  name: string;
  description: string;
  type: 'text' | 'image' | 'pdf' | 'mixed';
  category: 'electronics' | 'computers' | 'phones' | 'accessories' | 'general';
  fields: TemplateField[];
  exampleContent: string;
  instructions?: string;
  isGlobal: boolean;
  supplierId?: string;
  tags: string[];
}

interface TemplateFormProps {
  initialData?: Partial<TemplateFormData>;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function TemplateForm({ initialData, onSubmit, onCancel, isEditing = false }: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'text',
    category: initialData?.category || 'general',
    fields: initialData?.fields || [],
    exampleContent: initialData?.exampleContent || '',
    instructions: initialData?.instructions || '',
    isGlobal: initialData?.isGlobal ?? true,
    supplierId: initialData?.supplierId || '',
    tags: initialData?.tags || [],
  });

  const [currentField, setCurrentField] = useState<TemplateField>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    validation: {},
  });

  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.fields.length === 0) {
      newErrors.fields = 'At least one field is required';
    }

    if (!formData.exampleContent.trim()) {
      newErrors.exampleContent = 'Example content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const addOrUpdateField = () => {
    if (!currentField.name.trim() || !currentField.label.trim()) {
      alert('Field name and label are required');
      return;
    }

    if (currentField.type === 'select' && (!currentField.options || currentField.options.length === 0)) {
      alert('Select fields must have at least one option');
      return;
    }

    const newFields = [...formData.fields];
    
    if (editingFieldIndex !== null) {
      newFields[editingFieldIndex] = currentField;
      setEditingFieldIndex(null);
    } else {
      // Check for duplicate field names
      if (newFields.some(f => f.name === currentField.name)) {
        alert('A field with this name already exists');
        return;
      }
      newFields.push(currentField);
    }

    setFormData({ ...formData, fields: newFields });
    resetCurrentField();
  };

  const editField = (index: number) => {
    setCurrentField({ ...formData.fields[index] });
    setEditingFieldIndex(index);
  };

  const deleteField = (index: number) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: newFields });
  };

  const resetCurrentField = () => {
    setCurrentField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      validation: {},
    });
    setEditingFieldIndex(null);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const addOption = (option: string) => {
    if (option.trim() && !currentField.options?.includes(option.trim())) {
      setCurrentField({
        ...currentField,
        options: [...(currentField.options || []), option.trim()],
      });
    }
  };

  const removeOption = (option: string) => {
    setCurrentField({
      ...currentField,
      options: currentField.options?.filter(o => o !== option),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full border rounded px-3 py-2 ${errors.name ? 'border-red-500' : ''}`}
              placeholder="e.g., Electronics Product Submission"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full border rounded px-3 py-2 ${errors.description ? 'border-red-500' : ''}`}
              rows={3}
              placeholder="Describe what this template is for..."
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Content Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="pdf">PDF</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="general">General</option>
                <option value="electronics">Electronics</option>
                <option value="computers">Computers</option>
                <option value="phones">Phones</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGlobal"
              checked={formData.isGlobal}
              onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isGlobal" className="text-sm">
              Make this template available to all suppliers (Global)
            </label>
          </div>

          {!formData.isGlobal && (
            <div>
              <label className="block text-sm font-medium mb-1">Supplier ID</label>
              <input
                type="text"
                value={formData.supplierId || ''}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter supplier UUID"
              />
            </div>
          )}
        </div>
      </div>

      {/* Template Fields */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Template Fields</h3>
        
        {errors.fields && <p className="text-red-500 text-sm mb-4">{errors.fields}</p>}

        {/* Existing Fields */}
        {formData.fields.length > 0 && (
          <div className="mb-6 space-y-2">
            {formData.fields.map((field, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium">{field.label}</div>
                  <div className="text-sm text-gray-600">
                    {field.name} • {field.type} • {field.required ? 'Required' : 'Optional'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editField(index)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteField(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Field Form */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium">
            {editingFieldIndex !== null ? 'Edit Field' : 'Add New Field'}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Field Name</label>
              <input
                type="text"
                value={currentField.name}
                onChange={(e) => setCurrentField({ ...currentField, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., productName"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Field Label</label>
              <input
                type="text"
                value={currentField.label}
                onChange={(e) => setCurrentField({ ...currentField, label: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Product Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Field Type</label>
              <select
                value={currentField.type}
                onChange={(e) => setCurrentField({ ...currentField, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="multiline">Multiline Text</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="fieldRequired"
                checked={currentField.required}
                onChange={(e) => setCurrentField({ ...currentField, required: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="fieldRequired" className="text-sm">Required Field</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Placeholder</label>
            <input
              type="text"
              value={currentField.placeholder || ''}
              onChange={(e) => setCurrentField({ ...currentField, placeholder: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Placeholder text..."
            />
          </div>

          {currentField.type === 'select' && (
            <div>
              <label className="block text-sm font-medium mb-1">Options</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add option..."
                  className="flex-1 border rounded px-3 py-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {currentField.options?.map((option, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded flex items-center gap-1">
                    {option}
                    <button
                      type="button"
                      onClick={() => removeOption(option)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addOrUpdateField}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingFieldIndex !== null ? 'Update Field' : 'Add Field'}
            </button>
            {editingFieldIndex !== null && (
              <button
                type="button"
                onClick={resetCurrentField}
                className="border px-4 py-2 rounded hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Example Content & Instructions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Example & Instructions</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Example Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.exampleContent}
              onChange={(e) => setFormData({ ...formData, exampleContent: e.target.value })}
              className={`w-full border rounded px-3 py-2 font-mono text-sm ${errors.exampleContent ? 'border-red-500' : ''}`}
              rows={6}
              placeholder="Provide an example of how suppliers should format their submission..."
            />
            {errors.exampleContent && <p className="text-red-500 text-sm mt-1">{errors.exampleContent}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Instructions</label>
            <textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Additional instructions for suppliers..."
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Tags</h3>
        
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Add tags..."
          />
          <button
            type="button"
            onClick={addTag}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-gray-600 hover:text-gray-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border px-6 py-2 rounded hover:bg-gray-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}
