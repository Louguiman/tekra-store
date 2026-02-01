import { Metadata } from 'next'
import { SearchResults } from '@/components/products/search-results'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Search Products - WestTech',
  description: 'Search for technology products across our catalog',
}

interface SearchPageProps {
  searchParams: {
    q?: string
  }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ''

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Search Results
            </h1>
            {query && (
              <p className="text-lg text-gray-600">
                Showing results for "{query}"
              </p>
            )}
          </div>
          
          <SearchResults query={query} />
        </div>
      </main>

      <Footer />
    </div>
  )
}