import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Use Vercel API proxy to avoid mixed content errors
// Browser (HTTPS) → Vercel API Route (server-side) → Backend (HTTP) ✅
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/proxy', // Proxy through Vercel API routes
  credentials: 'include', // Important for session-based cart
  prepareHeaders: (headers) => {
    // Add auth token if available (prioritize admin token)
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    const authToken = adminToken || token
    if (authToken) {
      headers.set('authorization', `Bearer ${authToken}`)
    }
    return headers
  },
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Product', 'Order', 'User', 'Country', 'Cart', 'Delivery', 'Admin'],
  endpoints: (builder) => ({
    // Admin Authentication
    adminLogin: builder.mutation<AdminAuthResponse, AdminLoginRequest>({
      query: (body) => ({
        url: '/auth/admin/login',
        method: 'POST',
        body,
      }),
    }),
    adminRefreshToken: builder.mutation<AdminAuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/admin/refresh',
        method: 'POST',
        body,
      }),
    }),
    validateAdminToken: builder.query<AdminUser, void>({
      query: () => '/auth/admin/validate',
      providesTags: ['Admin'],
    }),
    
    // Admin User Management
    getUsers: builder.query<UsersResponse, UserFilters>({
      query: (filters) => ({
        url: '/admin/users',
        params: filters,
      }),
      providesTags: ['User', 'Admin'],
    }),
    getUserById: builder.query<UserDetails, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: ['User', 'Admin'],
    }),
    updateUserRole: builder.mutation<UserDetails, { id: string; role: string }>({
      query: ({ id, role }) => ({
        url: `/admin/users/${id}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['User', 'Admin'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User', 'Admin'],
    }),
    
    // Admin Dashboard Analytics
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/admin/dashboard/stats',
      providesTags: ['Admin'],
    }),
    getOrdersByCountry: builder.query<OrdersByCountryResponse[], void>({
      query: () => '/admin/dashboard/orders-by-country',
      providesTags: ['Admin', 'Order'],
    }),
    getRevenueReport: builder.query<RevenueReportResponse, { startDate: string; endDate: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/admin/dashboard/revenue',
        params: { startDate, endDate },
      }),
      providesTags: ['Admin'],
    }),
    getPaymentMethodStatistics: builder.query<PaymentMethodStatsResponse[], { startDate?: string; endDate?: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/admin/analytics/payment-methods',
        params: { startDate, endDate },
      }),
      providesTags: ['Admin'],
    }),
    getInventoryTurnoverReport: builder.query<InventoryTurnoverResponse[], { startDate?: string; endDate?: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/admin/analytics/inventory-turnover',
        params: { startDate, endDate },
      }),
      providesTags: ['Admin'],
    }),
    getStockLevelReport: builder.query<StockLevelReportResponse, void>({
      query: () => '/admin/analytics/stock-levels',
      providesTags: ['Admin'],
    }),

    // Admin Order Management
    getAllOrders: builder.query<AdminOrdersResponse, AdminOrderFilters>({
      query: (filters) => ({
        url: '/admin/orders',
        params: filters,
      }),
      providesTags: ['Admin', 'Order'],
    }),
    getAdminOrderById: builder.query<Order, string>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: ['Admin', 'Order'],
    }),
    updateAdminOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus; trackingNumber?: string }>({
      query: ({ id, status, trackingNumber }) => ({
        url: `/admin/orders/${id}/status`,
        method: 'PATCH',
        body: { status, trackingNumber },
      }),
      invalidatesTags: ['Admin', 'Order'],
    }),

    // Admin Inventory Management
    getAllInventory: builder.query<InventoryItemResponse[], void>({
      query: () => '/admin/inventory',
      providesTags: ['Admin'],
    }),
    getLowStockItems: builder.query<LowStockItemResponse[], number | undefined>({
      query: (threshold) => ({
        url: '/admin/inventory/low-stock',
        params: threshold ? { threshold } : {},
      }),
      providesTags: ['Admin'],
    }),
    updateInventoryStock: builder.mutation<InventoryItemResponse, { productId: string } & UpdateStockRequest>({
      query: ({ productId, ...body }) => ({
        url: `/admin/inventory/${productId}/stock`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Admin'],
    }),
    adjustInventoryStock: builder.mutation<InventoryItemResponse, { productId: string; adjustment: number; reason?: string }>({
      query: ({ productId, adjustment, reason }) => ({
        url: `/admin/inventory/${productId}/adjust`,
        method: 'POST',
        body: { adjustment, reason },
      }),
      invalidatesTags: ['Admin'],
    }),

    // Admin Supplier Management
    getSuppliers: builder.query<SupplierResponse[], void>({
      query: () => '/admin/suppliers',
      providesTags: ['Admin'],
    }),
    getSupplierProducts: builder.query<SupplierProductResponse[], string>({
      query: (supplierId) => `/admin/suppliers/${supplierId}/products`,
      providesTags: ['Admin'],
    }),

    // Admin Validation Management
    getPendingValidations: builder.query<PaginatedValidationItems, ValidationFilters>({
      query: (filters) => ({
        url: '/admin/validations',
        params: filters,
      }),
      providesTags: ['Admin'],
    }),
    getValidationById: builder.query<ValidationItem, string>({
      query: (id) => `/admin/validations/${id}`,
      providesTags: ['Admin'],
    }),
    getValidationStats: builder.query<ValidationStats, void>({
      query: () => '/admin/validations/stats',
      providesTags: ['Admin'],
    }),
    getFeedbackCategories: builder.query<FeedbackCategory[], void>({
      query: () => '/admin/validations/feedback/categories',
      providesTags: ['Admin'],
    }),
    approveValidation: builder.mutation<{ success: boolean; message: string }, ApprovalRequest>({
      query: ({ id, ...body }) => ({
        url: `/admin/validations/${id}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin'],
    }),
    rejectValidation: builder.mutation<{ success: boolean; message: string }, RejectionRequest>({
      query: ({ id, ...body }) => ({
        url: `/admin/validations/${id}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin'],
    }),
    bulkApproveValidations: builder.mutation<BulkValidationResult, BulkApprovalRequest>({
      query: (body) => ({
        url: '/admin/validations/bulk/approve',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin'],
    }),
    bulkRejectValidations: builder.mutation<BulkValidationResult, BulkRejectionRequest>({
      query: (body) => ({
        url: '/admin/validations/bulk/reject',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin'],
    }),
    // Countries
    getCountries: builder.query<Country[], void>({
      query: () => '/countries',
      providesTags: ['Country'],
    }),
    getCountryByCode: builder.query<Country, string>({
      query: (code) => `/countries/${code}`,
      providesTags: ['Country'],
    }),
    getCountryConfig: builder.query<CountryConfig, string>({
      query: (code) => `/countries/${code}/config`,
      providesTags: ['Country'],
    }),
    getProductPricesForCountry: builder.query<ProductPrice[], { code: string; productIds?: string[] }>({
      query: ({ code, productIds }) => ({
        url: `/countries/${code}/prices`,
        params: productIds ? { productIds: productIds.join(',') } : {},
      }),
      providesTags: ['Country', 'Product'],
    }),
    formatCurrency: builder.query<{ formatted: string }, { code: string; amount: number }>({
      query: ({ code, amount }) => `/countries/${code}/format-currency/${amount}`,
    }),

    // Delivery
    getDeliveryMethods: builder.query<DeliveryMethodResponse[], string>({
      query: (countryCode) => `/delivery/methods/${countryCode}`,
      providesTags: ['Delivery'],
    }),
    getPickupPoints: builder.query<PickupPointResponse[], string>({
      query: (countryCode) => `/delivery/pickup-points/${countryCode}`,
      providesTags: ['Delivery'],
    }),
    calculateDeliveryFee: builder.mutation<DeliveryFeeResult, CalculateDeliveryFeeRequest>({
      query: (body) => ({
        url: '/delivery/calculate-fee',
        method: 'POST',
        body,
      }),
    }),
    getDeliveryTracking: builder.query<DeliveryTrackingResponse, string>({
      query: (trackingNumber) => `/delivery/tracking/${trackingNumber}`,
      providesTags: ['Delivery'],
    }),
    getDeliveryTrackingByOrder: builder.query<DeliveryTrackingResponse[], string>({
      query: (orderId) => `/delivery/tracking/order/${orderId}`,
      providesTags: ['Delivery'],
    }),

    // Cart
    getCart: builder.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<Cart, AddToCartRequest>({
      query: (body) => ({
        url: '/cart/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<Cart, UpdateCartItemRequest>({
      query: ({ productId, ...body }) => ({
        url: `/cart/items/${productId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation<Cart, string>({
      query: (productId) => ({
        url: `/cart/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation<Cart, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Products
    getProducts: builder.query<ProductsResponse, ProductFilters>({
      query: (filters) => ({
        url: '/products',
        params: filters,
      }),
      providesTags: ['Product'],
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: ['Product'],
    }),
    getProductBySlug: builder.query<Product, string>({
      query: (slug) => `/products/slug/${slug}`,
      providesTags: ['Product'],
    }),
    getProductsByCategory: builder.query<ProductsResponse, { categoryId: string; filters?: ProductFilters }>({
      query: ({ categoryId, filters = {} }) => ({
        url: `/products/category/${categoryId}`,
        params: filters,
      }),
      providesTags: ['Product'],
    }),
    getProductsBySegment: builder.query<ProductsResponse, { segment: ProductSegment; filters?: ProductFilters }>({
      query: ({ segment, filters = {} }) => ({
        url: `/products/segment/${segment}`,
        params: filters,
      }),
      providesTags: ['Product'],
    }),
    searchProducts: builder.query<ProductsResponse, { query: string; filters?: ProductFilters }>({
      query: ({ query, filters = {} }) => ({
        url: '/products/search',
        params: { q: query, ...filters },
      }),
      providesTags: ['Product'],
    }),
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: ['Product'],
    }),
    getProductSegments: builder.query<ProductSegment[], void>({
      query: () => '/product-segments',
      providesTags: ['Product'],
    }),

    // Admin Product Management
    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string } & Partial<CreateProductRequest>>({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    uploadProductImage: builder.mutation<ProductImage, { productId: string; formData: FormData }>({
      query: ({ productId, formData }) => ({
        url: `/products/${productId}/images`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProductImage: builder.mutation<void, string>({
      query: (imageId) => ({
        url: `/products/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    assignRefurbishedGrade: builder.mutation<Product, { productId: string; grade: RefurbishedGrade }>({
      query: ({ productId, grade }) => ({
        url: `/products/${productId}/refurbished-grade`,
        method: 'PATCH',
        body: { grade },
      }),
      invalidatesTags: ['Product'],
    }),

    // Orders
    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order', 'Cart'],
    }),
    getOrder: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: ['Order'],
    }),
    getOrderByNumber: builder.query<Order, string>({
      query: (orderNumber) => `/orders/by-number/${orderNumber}`,
      providesTags: ['Order'],
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => '/orders/my-orders',
      providesTags: ['Order'],
    }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order'],
    }),

    // Payments
    initiatePayment: builder.mutation<PaymentInitiationResponse, InitiatePaymentRequest>({
      query: (body) => ({
        url: '/payments/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
    verifyPayment: builder.query<PaymentVerificationResponse, string>({
      query: (transactionRef) => `/payments/verify/${transactionRef}`,
    }),
    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (transactionRef) => `/payments/status/${transactionRef}`,
    }),
    retryPayment: builder.mutation<PaymentInitiationResponse, { transactionRef: string; paymentMethod?: string }>({
      query: (body) => ({
        url: '/payments/retry',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
  }),
})

export const {
  useGetCountriesQuery,
  useGetCountryByCodeQuery,
  useGetCountryConfigQuery,
  useGetProductPricesForCountryQuery,
  useFormatCurrencyQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductBySlugQuery,
  useGetProductsByCategoryQuery,
  useGetProductsBySegmentQuery,
  useSearchProductsQuery,
  useGetCategoriesQuery,
  useGetProductSegmentsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
  useAssignRefurbishedGradeMutation,
  useGetDeliveryMethodsQuery,
  useGetPickupPointsQuery,
  useCalculateDeliveryFeeMutation,
  useGetDeliveryTrackingQuery,
  useGetDeliveryTrackingByOrderQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetOrderByNumberQuery,
  useGetMyOrdersQuery,
  useUpdateOrderStatusMutation,
  useInitiatePaymentMutation,
  useVerifyPaymentQuery,
  useGetPaymentStatusQuery,
  useRetryPaymentMutation,
  // Admin hooks
  useAdminLoginMutation,
  useAdminRefreshTokenMutation,
  useValidateAdminTokenQuery,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetDashboardStatsQuery,
  useGetOrdersByCountryQuery,
  useGetRevenueReportQuery,
  useGetPaymentMethodStatisticsQuery,
  useGetInventoryTurnoverReportQuery,
  useGetStockLevelReportQuery,
  // Admin Order Management
  useGetAllOrdersQuery,
  useGetAdminOrderByIdQuery,
  useUpdateAdminOrderStatusMutation,
  // Admin Inventory Management
  useGetAllInventoryQuery,
  useGetLowStockItemsQuery,
  useUpdateInventoryStockMutation,
  useAdjustInventoryStockMutation,
  // Admin Supplier Management
  useGetSuppliersQuery,
  useGetSupplierProductsQuery,
  // Admin Validation Management
  useGetPendingValidationsQuery,
  useGetValidationByIdQuery,
  useGetValidationStatsQuery,
  useGetFeedbackCategoriesQuery,
  useApproveValidationMutation,
  useRejectValidationMutation,
  useBulkApproveValidationsMutation,
  useBulkRejectValidationsMutation,
} = api

// Types
export interface Country {
  id: string
  code: string
  name: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface CountryConfig {
  code: string
  deliveryMethods: DeliveryMethod[]
  paymentProviders: PaymentProvider[]
}

export interface DeliveryMethod {
  id: string
  name: string
  type: 'own_delivery' | 'partner_logistics'
  baseFee: number
  feePerKm?: number
  estimatedDays: number
  description?: string
}

// New Delivery Types
export interface DeliveryMethodResponse {
  id: string
  name: string
  type: 'own_delivery' | 'partner_logistics'
  baseFee: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  description?: string
  isActive: boolean
  countryCode: string
}

export interface PickupPointResponse {
  id: string
  name: string
  address: string
  city: string
  phone?: string
  instructions?: string
  isActive: boolean
  countryCode: string
}

export interface CalculateDeliveryFeeRequest {
  countryCode: string
  deliveryMethodId: string
  city: string
  orderValue?: number
  weight?: number
}

export interface DeliveryFeeResult {
  deliveryFee: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  deliveryMethodName: string
  freeDeliveryThreshold?: number
}

export interface DeliveryTrackingResponse {
  id: string
  trackingNumber: string
  status: 'preparing' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery'
  estimatedDeliveryDate?: string
  actualDeliveryDate?: string
  deliveryNotes?: string
  carrierName?: string
  orderId: string
  createdAt: string
  updatedAt: string
}

export interface PaymentProvider {
  id: string
  name: string
  type: 'mobile_money' | 'card'
  provider: 'orange' | 'wave' | 'moov' | 'visa' | 'mastercard'
  isActive: boolean
  processingFee?: number
}

export interface ProductPrice {
  id: string
  price: number
  promoPrice?: number
  createdAt: string
  updatedAt: string
  product: {
    id: string
    name: string
    slug: string
  }
  country: Country
}

// Cart Types
export interface CartItem {
  productId: string
  quantity: number
  unitPrice: number
  product: {
    id: string
    name: string
    slug: string
    images: Array<{ url: string }>
  }
}

export interface Cart {
  items: CartItem[]
  totalAmount: number
  totalItems: number
}

export interface AddToCartRequest {
  productId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  productId: string
  quantity: number
}

// Order Types
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface DeliveryAddress {
  fullName: string
  phone: string
  address: string
  city: string
  postalCode?: string
}

export interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: {
    id: string
    name: string
    slug: string
    images: Array<{ url: string }>
  }
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  deliveryFee: number
  deliveryAddress: DeliveryAddress
  customerEmail?: string
  customerPhone: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  country: Country
  user?: {
    id: string
    fullName: string
    email?: string
  }
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string
    quantity: number
  }>
  deliveryAddress: DeliveryAddress
  countryId: string
  customerEmail?: string
  customerPhone: string
  userId?: string
}

// Product Types
export enum ProductSegment {
  PREMIUM = 'premium',
  MID_RANGE = 'mid_range',
  REFURBISHED = 'refurbished',
}

export enum RefurbishedGrade {
  A = 'A',
  B = 'B',
  C = 'C',
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  children?: Category[]
}

export interface ProductSpecification {
  id: string
  name: string
  value: string
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  sortOrder?: number
  isPrimary: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  isRefurbished: boolean
  refurbishedGrade?: RefurbishedGrade
  warrantyMonths: number
  createdAt: string
  updatedAt: string
  category: Category
  segment: ProductSegment
  specifications: ProductSpecification[]
  images: ProductImage[]
  prices: ProductPrice[]
  inventory?: {
    quantity: number
    isInStock: boolean
  }
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductFilters {
  page?: number
  limit?: number
  categoryId?: string
  segment?: ProductSegment
  minPrice?: number
  maxPrice?: number
  brand?: string
  isRefurbished?: boolean
  refurbishedGrade?: RefurbishedGrade
  inStock?: boolean
  countryCode?: string
  sortBy?: 'name' | 'price' | 'createdAt' | 'popularity'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Admin Product Management Types
export interface CreateProductRequest {
  name: string
  description?: string
  categoryId: string
  segmentId: string
  brand?: string
  isRefurbished?: boolean
  refurbishedGrade?: RefurbishedGrade
  warrantyMonths?: number
  specifications?: Array<{
    name: string
    value: string
    sortOrder?: number
  }>
  images?: Array<{
    url: string
    altText?: string
    sortOrder?: number
    isPrimary?: boolean
  }>
  prices: Array<{
    countryId: string
    price: number
    promoPrice?: number
  }>
}

// Payment Types
export enum PaymentMethod {
  ORANGE_MONEY = 'orange_money',
  WAVE = 'wave',
  MOOV = 'moov',
  CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface InitiatePaymentRequest {
  orderId: string
  paymentMethod: PaymentMethod
  amount: number
  customerPhone?: string
  customerEmail?: string
  returnUrl?: string
  cancelUrl?: string
}

export interface PaymentInitiationResponse {
  transactionRef: string
  status: PaymentStatus
  paymentUrl?: string
  qrCode?: string
  instructions?: string
  expiresAt?: string
}

export interface PaymentVerificationResponse {
  transactionRef: string
  status: PaymentStatus
  amount: number
  paymentMethod: PaymentMethod
  completedAt?: string
  failureReason?: string
}

export interface PaymentStatusResponse {
  transactionRef: string
  status: PaymentStatus
  amount: number
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt: string
  completedAt?: string
  failureReason?: string
  canRetry: boolean
}

export interface MobileMoneyPaymentData {
  phoneNumber: string
  provider: 'orange' | 'wave' | 'moov'
}

export interface CardPaymentData {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardholderName: string
}

// Admin Types
export interface AdminUser {
  id: string
  fullName: string
  email?: string
  phone: string
  role: 'admin' | 'staff'
  countryCode?: string
  createdAt: string
  updatedAt: string
}

export interface AdminLoginRequest {
  email?: string
  phone?: string
  password: string
}

export interface AdminAuthResponse {
  accessToken: string
  refreshToken: string
  user: AdminUser
  expiresIn: string
}

export interface UserDetails {
  id: string
  fullName: string
  email?: string
  phone: string
  role: 'admin' | 'staff' | 'customer'
  countryCode?: string
  createdAt: string
  updatedAt: string
  orders?: Order[]
}

export interface UsersResponse {
  users: UserDetails[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserFilters {
  page?: number
  limit?: number
  role?: 'admin' | 'staff' | 'customer'
  countryCode?: string
  search?: string
  sortBy?: 'fullName' | 'email' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface DashboardStats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
  totalProducts: number
  lowStockProducts: number
  recentOrders: Order[]
}

export interface OrdersByCountryResponse {
  countryCode: string
  countryName: string
  orderCount: number
  totalRevenue: number
}

export interface RevenueReportResponse {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  revenueByDay: Array<{
    date: string
    revenue: number
    orderCount: number
  }>
  revenueByPaymentMethod: Array<{
    paymentMethod: PaymentMethod
    revenue: number
    orderCount: number
  }>
}

// Admin Order Management Types
export interface AdminOrderFilters {
  status?: OrderStatus
  page?: number
  limit?: number
}

export interface AdminOrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Admin Inventory Management Types
export interface InventoryItemResponse {
  id: string
  quantity: number
  warehouseLocation: string
  supplierId?: string
  lowStockThreshold: number
  updatedAt: string
  product: {
    id: string
    name: string
    slug: string
    images: ProductImage[]
  }
}

export interface LowStockItemResponse {
  id: string
  productId: string
  productName: string
  currentQuantity: number
  lowStockThreshold: number
  warehouseLocation: string
  supplierId?: string
  lastUpdated: string
}

export interface UpdateStockRequest {
  quantity: number
  warehouseLocation?: string
  supplierId?: string
  lowStockThreshold?: number
}

// Admin Supplier Management Types
export interface SupplierResponse {
  id: string
  productCount: number
}

// Admin Validation Management Types
export interface ValidationFilters {
  supplierId?: string
  contentType?: 'text' | 'image' | 'pdf' | 'voice'
  priority?: 'low' | 'medium' | 'high'
  category?: string
  minConfidence?: number
  maxConfidence?: number
  page?: number
  limit?: number
}

export interface ValidationItem {
  id: string
  submissionId: string
  supplierId: string
  supplierName: string
  originalContent: {
    type: 'text' | 'image' | 'pdf' | 'voice'
    content: string
    mediaUrl?: string
  }
  extractedProduct: ExtractedProduct
  suggestedActions: ValidationAction[]
  priority: 'low' | 'medium' | 'high'
  confidenceScore: number
  createdAt: string
  estimatedProcessingTime: number
  relatedValidations?: string[]
}

export interface ExtractedProduct {
  name: string
  brand?: string
  category?: string
  condition?: string
  grade?: string
  price?: number
  currency?: string
  quantity?: number
  specifications?: Record<string, string>
  confidenceScore: number
  extractionMetadata: {
    sourceType: 'text' | 'image' | 'pdf' | 'voice'
    processingTime: number
    aiModel: string
    extractedFields: string[]
  }
}

export interface ValidationAction {
  type: 'create' | 'update' | 'merge'
  targetProductId?: string
  confidence: number
  reasoning: string
  suggestedEdits?: Partial<ExtractedProduct>
}

export interface PaginatedValidationItems {
  items: ValidationItem[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ValidationStats {
  totalPending: number
  highPriority: number
  avgProcessingTime: number
  approvalRate: number
  commonRejectionReasons: Array<{ reason: string; count: number }>
}

export interface FeedbackCategory {
  id: string
  name: string
  description: string
  subcategories: string[]
}

export interface ApprovalRequest {
  id: string
  edits?: Partial<ExtractedProduct>
  notes?: string
}

export interface RejectionRequest {
  id: string
  feedback: {
    category: string
    subcategory?: string
    description: string
    severity: string
    suggestedImprovement?: string
  }
  notes?: string
}

export interface BulkApprovalRequest {
  validationIds: string[]
  globalEdits?: Record<string, Partial<ExtractedProduct>>
  notes?: string
}

export interface BulkRejectionRequest {
  validationIds: string[]
  feedback: {
    category: string
    subcategory?: string
    description: string
    severity: string
    suggestedImprovement?: string
  }
  notes?: string
}

export interface BulkValidationResult {
  successful: string[]
  failed: Array<{ id: string; error: string }>
  totalProcessed: number
}

export interface SupplierProductResponse {
  id: string
  quantity: number
  warehouseLocation: string
  supplierId: string
  lowStockThreshold: number
  updatedAt: string
  product: {
    id: string
    name: string
    slug: string
    images: ProductImage[]
  }
}

// New Analytics Types
export interface PaymentMethodStatsResponse {
  paymentMethod: string
  orderCount: number
  totalRevenue: number
  averageOrderValue: number
}

export interface InventoryTurnoverResponse {
  productId: string
  productName: string
  category: string
  currentStock: number
  totalSold: number
  turnoverRatio: number
  daysOfInventory: number | null
  averagePrice: number
  revenue: number
  warehouseLocation: string
  supplierId?: string
}

export interface StockLevelReportResponse {
  summary: {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    wellStockedCount: number
    totalStockValue: number
  }
  stockByCategory: Array<{
    category: string
    totalItems: number
    totalStock: number
    lowStockItems: number
    outOfStockItems: number
  }>
  lowStockItems: Array<{
    productId: string
    productName: string
    currentStock: number
    threshold: number
    warehouseLocation: string
    supplierId?: string
  }>
  outOfStockItems: Array<{
    productId: string
    productName: string
    warehouseLocation: string
    supplierId?: string
  }>
}