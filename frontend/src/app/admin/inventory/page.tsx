'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/admin-layout'
import { 
  useGetAllInventoryQuery, 
  useGetLowStockItemsQuery, 
  useUpdateInventoryStockMutation,
  useAdjustInventoryStockMutation,
  useGetSuppliersQuery 
} from '@/store/api'

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock' | 'suppliers'>('all')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [stockUpdate, setStockUpdate] = useState({
    quantity: 0,
    warehouseLocation: '',
    supplierId: '',
    lowStockThreshold: 10,
  })
  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment: 0,
    reason: '',
  })
  const [adjustmentMode, setAdjustmentMode] = useState(false)

  const { data: allInventory, isLoading: inventoryLoading } = useGetAllInventoryQuery()
  const { data: lowStockItems, isLoading: lowStockLoading } = useGetLowStockItemsQuery(undefined)
  const { data: suppliers, isLoading: suppliersLoading } = useGetSuppliersQuery()

  const [updateStock, { isLoading: isUpdatingStock }] = useUpdateInventoryStockMutation()
  const [adjustStock, { isLoading: isAdjustingStock }] = useAdjustInventoryStockMutation()

  const handleStockUpdate = async (productId: string) => {
    try {
      await updateStock({
        productId,
        ...stockUpdate,
      }).unwrap()
      setSelectedItem(null)
      resetForms()
    } catch (error) {
      console.error('Failed to update stock:', error)
    }
  }

  const handleStockAdjustment = async (productId: string) => {
    try {
      await adjustStock({
        productId,
        adjustment: stockAdjustment.adjustment,
        reason: stockAdjustment.reason,
      }).unwrap()
      setSelectedItem(null)
      resetForms()
    } catch (error) {
      console.error('Failed to adjust stock:', error)
    }
  }

  const resetForms = () => {
    setStockUpdate({
      quantity: 0,
      warehouseLocation: '',
      supplierId: '',
      lowStockThreshold: 10,
    })
    setStockAdjustment({
      adjustment: 0,
      reason: '',
    })
    setAdjustmentMode(false)
  }

  const openUpdateModal = (item: any) => {
    setSelectedItem(item.product.id)
    setStockUpdate({
      quantity: item.quantity,
      warehouseLocation: item.warehouseLocation || '',
      supplierId: item.supplierId || '',
      lowStockThreshold: item.lowStockThreshold || 10,
    })
    setAdjustmentMode(false)
  }

  const openAdjustmentModal = (item: any) => {
    setSelectedItem(item.product.id)
    setAdjustmentMode(true)
  }

  const getStockStatusColor = (quantity: number, threshold: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800'
    if (quantity <= threshold) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getStockStatusText = (quantity: number, threshold: number) => {
    if (quantity === 0) return 'Out of Stock'
    if (quantity <= threshold) return 'Low Stock'
    return 'In Stock'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage product inventory, stock levels, and suppliers
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Inventory
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'low-stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Low Stock Alerts
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suppliers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Suppliers
            </button>
          </nav>
        </div>

        {/* All Inventory Tab */}
        {activeTab === 'all' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Inventory Items
              </h3>
              
              {inventoryLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : allInventory && allInventory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allInventory.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {item.product.images?.[0] && (
                                <img
                                  className="h-10 w-10 rounded-lg object-cover mr-3"
                                  src={item.product.images[0].url}
                                  alt={item.product.name}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.product.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.product.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item.quantity, item.lowStockThreshold)}`}>
                              {getStockStatusText(item.quantity, item.lowStockThreshold)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.warehouseLocation || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.supplierId || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openUpdateModal(item)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => openAdjustmentModal(item)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No inventory items found.</p>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Tab */}
        {activeTab === 'low-stock' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Low Stock Alerts
              </h3>
              
              {lowStockLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : lowStockItems && lowStockItems.length > 0 ? (
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              {item.productName}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Current: {item.currentQuantity} | Threshold: {item.lowStockThreshold}
                            </p>
                            <p className="text-xs text-gray-400">
                              Location: {item.warehouseLocation || 'Not specified'} | 
                              Supplier: {item.supplierId || 'Not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const mockItem = {
                                product: { id: item.productId },
                                quantity: item.currentQuantity,
                                warehouseLocation: item.warehouseLocation,
                                supplierId: item.supplierId,
                                lowStockThreshold: item.lowStockThreshold,
                              }
                              openUpdateModal(mockItem)
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No low stock items. All products are well stocked!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Suppliers
              </h3>
              
              {suppliersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : suppliers && suppliers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Supplier ID: {supplier.id}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {supplier.productCount} products
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No suppliers found.</p>
              )}
            </div>
          </div>
        )}

        {/* Update/Adjust Stock Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {adjustmentMode ? 'Adjust Stock' : 'Update Stock'}
                </h3>
                
                {adjustmentMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Adjustment
                      </label>
                      <input
                        type="number"
                        value={stockAdjustment.adjustment}
                        onChange={(e) => setStockAdjustment(prev => ({ ...prev, adjustment: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter adjustment (+/-)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use positive numbers to add stock, negative to remove
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={stockAdjustment.reason}
                        onChange={(e) => setStockAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Reason for adjustment"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={stockUpdate.quantity}
                        onChange={(e) => setStockUpdate(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warehouse Location
                      </label>
                      <input
                        type="text"
                        value={stockUpdate.warehouseLocation}
                        onChange={(e) => setStockUpdate(prev => ({ ...prev, warehouseLocation: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier ID
                      </label>
                      <input
                        type="text"
                        value={stockUpdate.supplierId}
                        onChange={(e) => setStockUpdate(prev => ({ ...prev, supplierId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        value={stockUpdate.lowStockThreshold}
                        onChange={(e) => setStockUpdate(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 10 }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setSelectedItem(null)
                      resetForms()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => adjustmentMode ? handleStockAdjustment(selectedItem) : handleStockUpdate(selectedItem)}
                    disabled={isUpdatingStock || isAdjustingStock}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {(isUpdatingStock || isAdjustingStock) ? 'Processing...' : (adjustmentMode ? 'Adjust Stock' : 'Update Stock')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}