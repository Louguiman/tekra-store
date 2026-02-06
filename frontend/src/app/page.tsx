'use client';

import { CountrySelector } from '@/components/country-selector'
import { CategoryGrid } from '@/components/products/category-grid'
import { ProductGrid } from '@/components/products/product-grid'
import { PromoBanner } from '@/components/home/promo-banner'
import { SplitBanner } from '@/components/home/split-banner'
import { CountdownBanner } from '@/components/home/countdown-banner'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import type { Product } from '@/store/api'

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [dealsProducts, setDealsProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  const selectedCountry = useSelector((state: RootState) => state.country.selectedCountry);
  const countryCode = selectedCountry?.code || 'SN'; // Default to Senegal if no country selected

  useEffect(() => {
    fetchHomePageData();
  }, []);

  const fetchHomePageData = async () => {
    try {
      // Use Next.js API routes which proxy to backend using internal Docker network
      const [featured, trending, deals, arrivals] = await Promise.all([
        fetch('/api/products/featured?limit=8').then(r => r.json()),
        fetch('/api/products/trending?limit=8').then(r => r.json()),
        fetch('/api/products/deals?limit=8').then(r => r.json()),
        fetch('/api/products/new-arrivals?limit=8').then(r => r.json()),
      ]);

      setFeaturedProducts(featured);
      setTrendingProducts(trending);
      setDealsProducts(deals);
      setNewArrivals(arrivals);
    } catch (error) {
      console.error('Failed to fetch homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Gaming Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden section-gaming">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200"></div>
        
        {/* Floating gaming elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-secondary-500/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-accent-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Gaming title with neon effect */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-gaming font-bold mb-8 animate-fade-in">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 animate-neon-pulse">
                {t('home.hero.title')}
              </span>
              <br />
              <span className="text-dark-800 font-tech text-4xl md:text-5xl lg:text-6xl">
                {t('home.hero.subtitle')}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl mb-12 text-dark-600 font-tech max-w-4xl mx-auto animate-slide-up">
              {t('home.hero.description')}
            </p>
            
            {/* Gaming CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CountrySelector />
              <Link href="/products" className="btn-neon text-lg px-8 py-4 font-tech">
                {t('home.hero.exploreArsenal')}
              </Link>
              <Link href="/categories/premium" className="btn-primary text-lg px-8 py-4 font-tech">
                {t('home.hero.premiumGaming')}
              </Link>
            </div>

            {/* Gaming stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-primary-500 mb-2">1000+</div>
                <div className="text-sm font-tech text-dark-600">{t('home.stats.products')}</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-secondary-500 mb-2">3</div>
                <div className="text-sm font-tech text-dark-600">{t('home.stats.countries')}</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-accent-500 mb-2">24/7</div>
                <div className="text-sm font-tech text-dark-600">{t('home.stats.support')}</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-neon-blue mb-2">99%</div>
                <div className="text-sm font-tech text-dark-600">{t('home.stats.satisfaction')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Featured Products Section */}
      {!loading && featuredProducts.length > 0 && (
        <section className="py-20 section-gaming">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
                  {t('home.sections.featured')}
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
                {t('home.sections.featuredDesc')}
              </p>
            </div>
            
            <ProductGrid products={featuredProducts} countryCode={countryCode} />
            
            <div className="text-center mt-12">
              <Link href="/products" className="btn-primary text-lg px-8 py-4 font-tech inline-block">
                {t('home.buttons.viewAll')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Promo Banner - Free Shipping */}
      <PromoBanner
        title={t('home.banners.freeShipping.title')}
        subtitle={t('home.banners.freeShipping.subtitle')}
        ctaText={t('home.banners.freeShipping.cta')}
        ctaLink="/products"
        variant="primary"
        icon={
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        }
      />

      {/* Epic Deals Banner */}
      {!loading && dealsProducts.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-600/30 via-primary-600/30 to-secondary-600/30"></div>
          <div className="absolute inset-0 bg-[url('/images/gaming-hero-bg.svg')] opacity-10 bg-cover bg-center"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-block px-6 py-2 bg-accent-500 text-white font-gaming text-sm rounded-full mb-4 animate-pulse">
                {t('home.sections.dealsTag')}
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-primary-400">
                  {t('home.sections.dealsTitle')}
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
                {t('home.sections.dealsDesc')}
              </p>
            </div>
            
            <ProductGrid products={dealsProducts} countryCode={countryCode} />
            
            <div className="text-center mt-12">
              <Link href="/products?isRefurbished=true" className="btn-neon text-lg px-8 py-4 font-tech inline-block">
                {t('home.buttons.exploreDeals')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Gaming Categories Section */}
      <section className="py-20 section-gaming">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
                {t('home.sections.categories')}
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
              {t('home.sections.categoriesDesc')}
            </p>
          </div>
          
          <CategoryGrid />
        </div>
      </section>

      {/* Split Banner - Gaming vs Productivity */}
      <SplitBanner
        leftTitle={t('home.banners.gamingVsProductivity.gamingTitle')}
        leftSubtitle={t('home.banners.gamingVsProductivity.gamingSubtitle')}
        leftCta={t('home.banners.gamingVsProductivity.gamingCta')}
        leftLink="/categories/gaming"
        leftGradient="from-primary-600 to-secondary-600"
        rightTitle={t('home.banners.gamingVsProductivity.productivityTitle')}
        rightSubtitle={t('home.banners.gamingVsProductivity.productivitySubtitle')}
        rightCta={t('home.banners.gamingVsProductivity.productivityCta')}
        rightLink="/categories/productivity"
        rightGradient="from-accent-600 to-primary-600"
      />

      {/* Trending Now Section */}
      {!loading && trendingProducts.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-100 to-dark-200"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-block px-6 py-2 bg-primary-500 text-white font-gaming text-sm rounded-full mb-4">
                {t('home.sections.trendingTag')}
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  {t('home.sections.trendingTitle')}
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
                {t('home.sections.trendingDesc')}
              </p>
            </div>
            
            <ProductGrid products={trendingProducts} countryCode={countryCode} />
          </div>
        </section>
      )}

      {/* New Arrivals Section */}
      {!loading && newArrivals.length > 0 && (
        <section className="py-20 section-gaming">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block px-6 py-2 bg-secondary-500 text-white font-gaming text-sm rounded-full mb-4">
                {t('home.sections.newArrivalsTag')}
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-400 to-accent-400">
                  {t('home.sections.newArrivalsTitle')}
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
                {t('home.sections.newArrivalsDesc')}
              </p>
            </div>
            
            <ProductGrid products={newArrivals} countryCode={countryCode} />
            
            <div className="text-center mt-12">
              <Link href="/products?sortBy=createdAt&sortOrder=DESC" className="btn-primary text-lg px-8 py-4 font-tech inline-block">
                {t('home.buttons.seeNewArrivals')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Countdown Banner - Flash Sale */}
      <CountdownBanner
        title={t('home.banners.flashSale.title')}
        subtitle={t('home.banners.flashSale.subtitle')}
        endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now
        ctaText={t('home.banners.flashSale.cta')}
        ctaLink="/products?isRefurbished=true"
      />

      {/* Gaming Features Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-100 to-dark-200"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-gaming font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                {t('home.features.title')}
              </span>
            </h2>
            <p className="text-xl text-dark-600 font-tech max-w-3xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Payment Feature */}
            <div className="card-gaming text-center group hover-lift">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">{t('home.features.payment.title')}</h3>
              <p className="text-dark-600 font-tech">{t('home.features.payment.desc')}</p>
            </div>

            {/* Delivery Feature */}
            <div className="card-gaming text-center group hover-lift">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">{t('home.features.delivery.title')}</h3>
              <p className="text-dark-600 font-tech">{t('home.features.delivery.desc')}</p>
            </div>

            {/* Quality Feature */}
            <div className="card-gaming text-center group hover-lift">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">{t('home.features.quality.title')}</h3>
              <p className="text-dark-600 font-tech">{t('home.features.quality.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Banner - Trade-In Program */}
      <PromoBanner
        title={t('home.banners.tradeIn.title')}
        subtitle={t('home.banners.tradeIn.subtitle')}
        ctaText={t('home.banners.tradeIn.cta')}
        ctaLink="/support"
        variant="accent"
        icon={
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
      />

      {/* Testimonials Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-secondary-600/20 to-accent-600/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-gaming font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                {t('home.testimonials.title')}
              </span>
            </h2>
            <p className="text-xl text-dark-600 font-tech max-w-3xl mx-auto">
              {t('home.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="card-gaming p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-dark-600 font-tech mb-4">{t('home.testimonials.review1')}</p>
              <p className="font-gaming text-primary-500">{t('home.testimonials.customer1')}</p>
            </div>

            <div className="card-gaming p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-dark-600 font-tech mb-4">{t('home.testimonials.review2')}</p>
              <p className="font-gaming text-primary-500">{t('home.testimonials.customer2')}</p>
            </div>

            <div className="card-gaming p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-dark-600 font-tech mb-4">{t('home.testimonials.review3')}</p>
              <p className="font-gaming text-primary-500">{t('home.testimonials.customer3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gaming CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-secondary-600/20 to-accent-600/20"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-gaming font-bold mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              {t('home.cta.title')}
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-dark-600 font-tech mb-12 max-w-3xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/products" className="btn-primary text-xl px-10 py-5 font-tech">
              {t('home.cta.startShopping')}
            </Link>
            <Link href="/support" className="btn-neon text-xl px-10 py-5 font-tech">
              {t('home.cta.getSupport')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
