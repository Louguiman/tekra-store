'use client'

import AdminLayout from '@/components/admin/admin-layout'
import Link from 'next/link'
import { 
  useGetDashboardStatsQuery, 
  useGetOrdersByCountryQuery,
  useGetPaymentMethodStatisticsQuery,
  useGetStockLevelReportQuery 
} from '@/store/api'

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useGetDashboardStatsQuery()
  const { data: ordersByCountry, isLoading: ordersLoading } = useGetOrdersByCountryQuery()
  const { data: paymentStats, isLoading: paymentLoading } = useGetPaymentMethodStatisticsQuery({})
  const { data: stockReport, isLoading: stockLoading } = useGetStockLevelReportQuery()

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary-500"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-32 w-32 border-t-4 border-secondary-500" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (statsError) {
    return (
      <AdminLayout>
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-xl"></div>
          <div className="relative bg-red-50 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-gaming font-bold text-red-700 mb-1">Error Loading Dashboard</h3>
                <p className="font-tech text-red-600">Unable to load dashboard data. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header with Gaming Theme */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-2xl blur-xl"></div>
          <div className="relative card-gaming p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-gaming font-bold mb-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
                    COMMAND CENTER
                  </span>
                </h1>
                <p className="text-dark-600 font-tech text-lg">
                  Welcome back, Commander. Here's your platform overview.
                </p>
              </div>
              <Link
                href="/admin/analytics"
                className="btn-primary font-gaming px-6 py-3 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                FULL ANALYTICS
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid with Gaming Theme */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-gaming group hover-lift">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-tech text-dark-500 mb-1">Total Users</p>
                <p className="text-2xl font-gaming font-bold text-dark-800">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-gaming group hover-lift">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-tech text-dark-500 mb-1">Total Orders</p>
                <p className="text-2xl font-gaming font-bold text-dark-800">{stats?.totalOrders || 0}</p>
              </div>
            </div>
          </div>

          <div className="card-gaming group hover-lift">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-tech text-dark-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-gaming font-bold text-dark-800">
                  {stats?.totalRevenue ? `${Math.round(stats.totalRevenue / 1000)}K` : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gaming group hover-lift">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-tech text-dark-500 mb-1">Pending Orders</p>
                <p className="text-2xl font-gaming font-bold text-dark-800">{stats?.pendingOrders || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Analytics Grid with Gaming Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Summary */}
          <div className="card-gaming">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-gaming font-bold text-dark-800">
                STOCK SUMMARY
              </h3>
            </div>
            {stockLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : stockReport ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-dark-50 rounded-lg border-2 border-dark-200 hover:border-primary-500 transition-colors duration-300">
                  <div className="text-3xl font-gaming font-bold text-dark-800 mb-1">{stockReport.summary.totalProducts}</div>
                  <div className="text-sm font-tech text-dark-600">Total Products</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-lg border-2 border-dark-200 hover:border-red-500 transition-colors duration-300">
                  <div className="text-3xl font-gaming font-bold text-red-600 mb-1">{stockReport.summary.lowStockCount}</div>
                  <div className="text-sm font-tech text-dark-600">Low Stock</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-lg border-2 border-dark-200 hover:border-yellow-500 transition-colors duration-300">
                  <div className="text-3xl font-gaming font-bold text-yellow-600 mb-1">{stockReport.summary.outOfStockCount}</div>
                  <div className="text-sm font-tech text-dark-600">Out of Stock</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-lg border-2 border-dark-200 hover:border-green-500 transition-colors duration-300">
                  <div className="text-3xl font-gaming font-bold text-green-600 mb-1">
                    {Math.round(stockReport.summary.totalStockValue / 1000)}K
                  </div>
                  <div className="text-sm font-tech text-dark-600">Stock Value (FCFA)</div>
                </div>
              </div>
            ) : (
              <p className="text-dark-500 font-tech text-center py-8">No stock data available.</p>
            )}
          </div>

          {/* Payment Methods */}
          <div className="card-gaming">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-gaming font-bold text-dark-800">
                PAYMENT METHODS
              </h3>
            </div>
            {paymentLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
              </div>
            ) : paymentStats && paymentStats.length > 0 ? (
              <div className="space-y-3">
                {paymentStats.slice(0, 4).map((stat, index) => (
                  <div key={stat.paymentMethod} className="flex justify-between items-center p-3 bg-dark-50 rounded-lg border-2 border-dark-200 hover:border-accent-500 transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-500 rounded-lg flex items-center justify-center text-white font-gaming font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-sm font-gaming font-bold text-dark-800">
                        {stat.paymentMethod.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-tech text-dark-600">{stat.orderCount} orders</div>
                      <div className="text-sm font-gaming font-bold text-accent-600">{Math.round(stat.totalRevenue / 1000)}K FCFA</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 font-tech text-center py-8">No payment data available.</p>
            )}
          </div>
        </div>

        {/* Orders by Country */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Orders by Country
            </h3>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : ordersByCountry && ordersByCountry.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordersByCountry.map((country) => (
                      <tr key={country.countryCode}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {country.countryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {country.orderCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {country.totalRevenue.toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No order data available.</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        {stats?.recentOrders && stats.recentOrders.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Orders
              </h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentOrders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.user?.fullName || order.customerPhone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.totalAmount.toLocaleString()} FCFA
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}