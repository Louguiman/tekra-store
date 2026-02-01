import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import { api } from './api'
import countryReducer from './slices/countrySlice'
import cartReducer from './slices/cartSlice'
import adminAuthReducer from './slices/adminAuthSlice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    country: countryReducer,
    cart: cartReducer,
    adminAuth: adminAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector