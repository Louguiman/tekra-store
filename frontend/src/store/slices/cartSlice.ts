import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../api'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartState {
  items: CartItem[]
  totalAmount: number
  totalItems: number
  isLoading: boolean
  error: string | null
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  isLoading: false,
  error: null,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Keep local cart actions for backward compatibility
    addToCart: (state, action: PayloadAction<Omit<CartItem, 'id'>>) => {
      // Normalize productId by trimming whitespace for comparison and storage
      const normalizedProductId = action.payload.productId.trim()
      
      // Don't allow empty productIds after normalization
      if (!normalizedProductId) {
        return
      }
      
      const existingItem = state.items.find(item => item.productId.trim() === normalizedProductId)
      
      if (existingItem) {
        existingItem.quantity += action.payload.quantity
      } else {
        state.items.push({
          ...action.payload,
          productId: normalizedProductId, // Store the normalized productId
          id: `${normalizedProductId}-${Date.now()}`,
        })
      }
      
      cartSlice.caseReducers.calculateTotals(state)
    },
    
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
      cartSlice.caseReducers.calculateTotals(state)
    },
    
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id)
      if (item) {
        item.quantity = action.payload.quantity
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.id !== action.payload.id)
        }
      }
      cartSlice.caseReducers.calculateTotals(state)
    },
    
    clearCart: (state) => {
      state.items = []
      state.totalAmount = 0
      state.totalItems = 0
    },
    
    calculateTotals: (state) => {
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    // Handle API cart actions
    builder
      .addMatcher(api.endpoints.getCart.matchPending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addMatcher(api.endpoints.getCart.matchFulfilled, (state, action) => {
        state.isLoading = false
        state.totalAmount = action.payload.totalAmount
        state.totalItems = action.payload.totalItems
        // Convert API cart items to local format
        state.items = action.payload.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.product.name,
          price: item.unitPrice,
          quantity: item.quantity,
          image: item.product.images[0]?.url,
        }))
      })
      .addMatcher(api.endpoints.getCart.matchRejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to load cart'
      })
      .addMatcher(api.endpoints.addToCart.matchFulfilled, (state, action) => {
        state.totalAmount = action.payload.totalAmount
        state.totalItems = action.payload.totalItems
        state.items = action.payload.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.product.name,
          price: item.unitPrice,
          quantity: item.quantity,
          image: item.product.images[0]?.url,
        }))
      })
      .addMatcher(api.endpoints.updateCartItem.matchFulfilled, (state, action) => {
        state.totalAmount = action.payload.totalAmount
        state.totalItems = action.payload.totalItems
        state.items = action.payload.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.product.name,
          price: item.unitPrice,
          quantity: item.quantity,
          image: item.product.images[0]?.url,
        }))
      })
      .addMatcher(api.endpoints.removeFromCart.matchFulfilled, (state, action) => {
        state.totalAmount = action.payload.totalAmount
        state.totalItems = action.payload.totalItems
        state.items = action.payload.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.product.name,
          price: item.unitPrice,
          quantity: item.quantity,
          image: item.product.images[0]?.url,
        }))
      })
      .addMatcher(api.endpoints.clearCart.matchFulfilled, (state) => {
        state.items = []
        state.totalAmount = 0
        state.totalItems = 0
      })
  },
})

export const { addToCart, removeFromCart, updateQuantity, clearCart, calculateTotals, setLoading, setError } = cartSlice.actions
export default cartSlice.reducer