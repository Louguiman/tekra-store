import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AdminUser {
  id: string
  fullName: string
  email?: string
  phone: string
  role: 'admin' | 'staff'
  countryCode?: string
}

export interface AdminAuthState {
  user: AdminUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AdminAuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{
      user: AdminUser
      token: string
      refreshToken: string
    }>) => {
      state.isLoading = false
      state.user = action.payload.user
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      state.error = null
      
      // Store tokens in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminToken', action.payload.token)
        localStorage.setItem('adminRefreshToken', action.payload.refreshToken)
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.error = null
      
      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminRefreshToken')
      }
    },
    clearError: (state) => {
      state.error = null
    },
    initializeAuth: (state) => {
      // Initialize auth state from localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('adminToken')
        const refreshToken = localStorage.getItem('adminRefreshToken')
        
        if (token && refreshToken) {
          state.token = token
          state.refreshToken = refreshToken
          // Note: We'll validate the token with the server separately
        }
      }
    },
  },
})

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  initializeAuth,
} = adminAuthSlice.actions

export default adminAuthSlice.reducer