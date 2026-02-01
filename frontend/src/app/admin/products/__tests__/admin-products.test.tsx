import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import AdminProductsPage from '../page'
import { api } from '@/store/api'

// Mock the admin layout
jest.mock('@/components/admin/admin-layout', () => {
  return function MockAdminLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="admin-layout">{children}</div>
  }
})

// Mock the API hooks
jest.mock('@/store/api', () => ({
  useGetProductsQuery: jest.fn(),
  useDeleteProductMutation: jest.fn(),
}))

const mockStore = configureStore({
  reducer: {
    api: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

describe('AdminProductsPage', () => {
  beforeEach(() => {
    const mockUseGetProductsQuery = require('@/store/api').useGetProductsQuery
    const mockUseDeleteProductMutation = require('@/store/api').useDeleteProductMutation
    
    mockUseGetProductsQuery.mockReturnValue({
      data: {
        products: [
          {
            id: '1',
            name: 'Test Product',
            brand: 'Test Brand',
            category: { name: 'Electronics' },
            segment: { name: 'premium' },
            prices: [{ price: 100000 }],
            inventory: [{ quantity: 10 }],
            images: [],
            isRefurbished: false,
          }
        ],
        total: 1
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
    
    mockUseDeleteProductMutation.mockReturnValue([jest.fn(), {}])
  })

  it('renders the admin products page', () => {
    render(
      <Provider store={mockStore}>
        <AdminProductsPage />
      </Provider>
    )

    expect(screen.getByText('Product Management')).toBeInTheDocument()
    expect(screen.getByText('Add New Product')).toBeInTheDocument()
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })

  it('displays product information correctly', () => {
    render(
      <Provider store={mockStore}>
        <AdminProductsPage />
      </Provider>
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Test Brand')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('10 units')).toBeInTheDocument()
  })
})