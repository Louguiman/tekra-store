import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/products/product-detail'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

interface ProductPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  // In a real app, you'd fetch the product data here for SEO
  return {
    title: `Product - WestTech`,
    description: 'Premium technology product with warranty and local delivery',
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <ProductDetail slug={params.slug} />
      </main>

      <Footer />
    </div>
  )
}