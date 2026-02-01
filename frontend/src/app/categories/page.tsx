import { Metadata } from 'next'
import { CategoryGrid } from '@/components/products/category-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Categories - WestTech',
  description: 'Browse products by category - Premium Gaming, Mid-Range, and Refurbished technology',
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Product Categories
            </h1>
            <p className="text-lg text-gray-600">
              Find the perfect technology products organized by category and price range
            </p>
          </div>
          
          <CategoryGrid />
        </div>
      </main>

      <Footer />
    </div>
  )
}