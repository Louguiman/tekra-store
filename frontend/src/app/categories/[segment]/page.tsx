import { Metadata } from 'next'
import { ProductCatalog } from '@/components/products/product-catalog'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProductSegment } from '@/store/api'

interface CategoryPageProps {
  params: {
    segment: string
  }
}

const segmentTitles = {
  premium: 'Premium Gaming',
  'mid-range': 'Mid-Range',
  refurbished: 'Refurbished',
}

const segmentDescriptions = {
  premium: 'High-end gaming and professional technology products',
  'mid-range': 'Quality technology products at affordable prices',
  refurbished: 'Certified refurbished products with warranty',
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const title = segmentTitles[params.segment as keyof typeof segmentTitles] || 'Category'
  const description = segmentDescriptions[params.segment as keyof typeof segmentDescriptions] || 'Technology products'
  
  return {
    title: `${title} - WestTech`,
    description,
  }
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const segment = params.segment.replace('-', '_').toUpperCase() as ProductSegment
  const title = segmentTitles[params.segment as keyof typeof segmentTitles] || 'Category'
  const description = segmentDescriptions[params.segment as keyof typeof segmentDescriptions] || 'Technology products'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h1>
            <p className="text-lg text-gray-600">
              {description}
            </p>
          </div>
          
          <ProductCatalog segment={segment} />
        </div>
      </main>

      <Footer />
    </div>
  )
}