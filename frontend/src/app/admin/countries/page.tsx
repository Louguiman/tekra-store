'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/admin-layout'
import { 
  useGetCountriesQuery, 
  useCreateCountryMutation, 
  useUpdateCountryMutation, 
  useDeleteCountryMutation,
  useSetDefaultCountryMutation
} from '@/store/api'
import { Country } from '@/store/api'

export default function AdminCountriesPage() {
  const { data: countries, isLoading, error, refetch } = useGetCountriesQuery()
  const [createCountry] = useCreateCountryMutation()
  const [updateCountry] = useUpdateCountryMutation()
  const [deleteCountry] = useDeleteCountryMutation()
  const [setDefaultCountry] = useSetDefaultCountryMutation()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    currency: 'FCFA',
    isDefault: false
  })

  useEffect(() => {
    if (editingCountry) {
      setFormData({
        code: editingCountry.code,
        name: editingCountry.name,
        currency: editingCountry.currency,
        isDefault: editingCountry.isDefault
      })
    } else {
      setFormData({
        code: '',
        name: '',
        currency: 'FCFA',
        isDefault: false
      })
    }
  }, [editingCountry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCountry) {
        await updateCountry({ code: editingCountry.code, body: formData }).unwrap()
      } else {
        await createCountry(formData).unwrap()
      }
      setIsModalOpen(false)
      setEditingCountry(null)
      refetch()
    } catch (err) {
      console.error('Failed to save country:', err)
      alert('Failed to save country. Please check if the code is unique.')
    }
  }

  const handleDelete = async (code: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteCountry(code).unwrap()
        refetch()
      } catch (err) {
        console.error('Failed to delete country:', err)
        alert('Failed to delete country.')
      }
    }
  }

  const handleSetDefault = async (code: string) => {
    try {
      await setDefaultCountry(code).unwrap()
      refetch()
    } catch (err) {
      console.error('Failed to set default country:', err)
      alert('Failed to set default country.')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-gaming font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              REGION SETTINGS
            </h1>
            <p className="mt-2 text-sm text-dark-600 font-tech">
              Manage countries, currencies, and regional defaults.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCountry(null)
              setIsModalOpen(true)
            }}
            className="btn-primary font-tech"
          >
            + Add Country
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {countries?.map((country) => (
            <div key={country.id} className={`card-gaming relative overflow-hidden ${country.isDefault ? 'border-primary-500/50 ring-1 ring-primary-500/30' : ''}`}>
              {country.isDefault && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                  Default
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">
                  {getFlagForCountry(country.code)}
                </div>
                <div>
                  <h3 className="text-xl font-gaming font-bold text-dark-800">{country.name}</h3>
                  <p className="text-sm text-dark-500 font-tech">Code: {country.code} | Currency: {country.currency}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setEditingCountry(country)
                    setIsModalOpen(true)
                  }}
                  className="flex-1 py-2 text-xs font-tech bg-dark-200 hover:bg-dark-300 text-dark-700 rounded transition-colors"
                >
                  Edit
                </button>
                {!country.isDefault && (
                  <button
                    onClick={() => handleSetDefault(country.code)}
                    className="flex-1 py-2 text-xs font-tech bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(country.code, country.name)}
                  className="px-3 py-2 text-xs font-tech bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
            <div className="card-gaming w-full max-w-md">
              <h2 className="text-2xl font-gaming font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                {editingCountry ? 'Edit Country' : 'Add New Country'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-tech font-medium text-dark-700 mb-1">Country Code (ISO 2-letter)</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-dark-800"
                    placeholder="e.g. SN"
                    maxLength={2}
                    required
                    disabled={!!editingCountry}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-tech font-medium text-dark-700 mb-1">Country Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-dark-800"
                    placeholder="e.g. Senegal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-tech font-medium text-dark-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-200/50 border border-dark-300/50 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-dark-800"
                    placeholder="e.g. FCFA"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-primary-500 bg-dark-200 border-dark-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isDefault" className="text-sm font-tech text-dark-700">Set as default country</label>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 font-tech text-dark-600 hover:text-dark-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary font-tech"
                  >
                    {editingCountry ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function getFlagForCountry(code: string): string {
  const flags: Record<string, string> = {
    'ML': '🇲🇱',
    'CI': '🇨🇮',
    'BF': '🇧🇫',
    'SN': '🇸🇳',
    'GN': '🇬🇳',
    'NE': '🇳🇪',
    'TG': '🇹🇬',
    'BJ': '🇧🇯',
  }
  return flags[code] || '🏳️'
}
