'use client'

import { RefurbishedGrade } from '@/types/product'

interface RefurbishedGradeSelectorProps {
  value?: RefurbishedGrade
  onChange: (grade: RefurbishedGrade) => void
  required?: boolean
}

const gradeDescriptions = {
  A: {
    title: 'Grade A - Excellent',
    description: 'Like new condition with minimal signs of use. Fully functional with original accessories.',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  B: {
    title: 'Grade B - Good',
    description: 'Good condition with light signs of use. Fully functional, may have minor cosmetic wear.',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  C: {
    title: 'Grade C - Fair',
    description: 'Fair condition with visible signs of use. Fully functional but may have cosmetic damage.',
    color: 'bg-red-50 border-red-200 text-red-800'
  }
}

export default function RefurbishedGradeSelector({ value, onChange, required }: RefurbishedGradeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Refurbished Grade {required && '*'}
      </label>
      
      <div className="space-y-3">
        {Object.entries(gradeDescriptions).map(([grade, info]) => (
          <div
            key={grade}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              value === grade 
                ? `${info.color} border-opacity-100` 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onChange(grade as RefurbishedGrade)}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="refurbishedGrade"
                  value={grade}
                  checked={value === grade}
                  onChange={() => onChange(grade as RefurbishedGrade)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {info.title}
                  </h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    value === grade ? info.color : 'bg-gray-100 text-gray-800'
                  }`}>
                    Grade {grade}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {info.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {required && !value && (
        <p className="mt-1 text-sm text-red-600">
          Please select a refurbished grade
        </p>
      )}
    </div>
  )
}