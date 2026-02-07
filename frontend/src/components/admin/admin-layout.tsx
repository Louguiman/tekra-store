'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector, useAppDispatch } from '@/store'
import { logout, initializeAuth } from '@/store/slices/adminAuthSlice'
import { useValidateAdminTokenQuery } from '@/store/api'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, token } = useAppSelector((state) => state.adminAuth)
  
  // Validate token on mount
  const { data: validatedUser, error: validationError, isLoading } = useValidateAdminTokenQuery(
    undefined,
    { skip: !token }
  )

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  useEffect(() => {
    if (validationError || (!isLoading && token && !validatedUser)) {
      dispatch(logout())
      router.push('/admin/login')
    }
  }, [validationError, validatedUser, token, isLoading, dispatch, router])

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleLogout = () => {
    dispatch(logout())
    router.push('/admin/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-dark-50">
      {/* Navigation Header */}
      <nav className="bg-dark-100 bg-opacity-80 backdrop-blur-md shadow-lg border-b border-primary-500 border-opacity-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/admin" className="text-xl font-gaming font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  ADMIN DASHBOARD
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                <Link
                  href="/admin"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Users
                </Link>
                <Link
                  href="/admin/products"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Products
                </Link>
                <Link
                  href="/admin/orders"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Orders
                </Link>
                <Link
                  href="/admin/inventory"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Inventory
                </Link>
                <Link
                  href="/admin/validations"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Validations
                </Link>
                <Link
                  href="/admin/analytics"
                  className="nav-link text-dark-700 hover:text-primary-400 whitespace-nowrap py-2 px-3 font-tech font-medium text-sm"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-4">
                <span className="text-sm text-dark-700 font-tech">
                  Welcome, <span className="text-primary-400 font-semibold">{user?.fullName}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-tech font-medium transition-all duration-300 hover:shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  )
}