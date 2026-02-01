'use client'

import { ReactNode } from 'react'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminRootLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-root">
      {children}
    </div>
  )
}