'use client'

import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from '@/store'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </Provider>
  )
}