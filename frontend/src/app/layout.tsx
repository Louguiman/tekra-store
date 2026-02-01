import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { WhatsAppButton } from '@/components/support/whatsapp-button'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'West Africa E-commerce Platform',
  description: 'Premium tech products for Mali, Côte d\'Ivoire, and Burkina Faso',
  keywords: ['e-commerce', 'technology', 'West Africa', 'Mali', 'Côte d\'Ivoire', 'Burkina Faso'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          {/* Floating WhatsApp Support Button */}
          <WhatsAppButton variant="floating" size="lg" />
        </Providers>
      </body>
    </html>
  )
}