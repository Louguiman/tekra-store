'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

export function HeaderWrapper() {
  const pathname = usePathname()
  
  // Do not show the main website header on admin pages
  // Admin pages have their own navigation in AdminLayout
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return <Header />
}
