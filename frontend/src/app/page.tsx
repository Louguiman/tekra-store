import { CountrySelector } from '@/components/country-selector'
import { CategoryGrid } from '@/components/products/category-grid'
import Link from 'next/link'

export default function HomePage() {
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
                LEVEL UP
              </span>
              <br />
              <span className="text-dark-800 font-tech text-4xl md:text-5xl lg:text-6xl">
                YOUR TECH GAME
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl mb-12 text-dark-600 font-tech max-w-4xl mx-auto animate-slide-up">
              Experience the <span className="text-neon-blue font-semibold">future of technology</span> with premium gaming gear and cutting-edge tech products across West Africa
            </p>
            
            {/* Gaming CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CountrySelector />
              <Link href="/products" className="btn-neon text-lg px-8 py-4 font-tech">
                EXPLORE ARSENAL
              </Link>
              <Link href="/categories/premium" className="btn-primary text-lg px-8 py-4 font-tech">
                PREMIUM GAMING
              </Link>
            </div>

            {/* Gaming stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-primary-500 mb-2">1000+</div>
                <div className="text-sm font-tech text-dark-600">Gaming Products</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-secondary-500 mb-2">3</div>
                <div className="text-sm font-tech text-dark-600">Countries Served</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-accent-500 mb-2">24/7</div>
                <div className="text-sm font-tech text-dark-600">Gaming Support</div>
              </div>
              <div className="card-gaming text-center">
                <div className="text-3xl font-gaming font-bold text-neon-blue mb-2">99%</div>
                <div className="text-sm font-tech text-dark-600">Satisfaction Rate</div>
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

      {/* Gaming Categories Section */}
      <section className="py-20 section-gaming">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
                GAMING ARSENAL
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-dark-600 font-tech max-w-3xl mx-auto">
              Choose your weapon. Dominate the battlefield. Experience gaming like never before.
            </p>
          </div>
          
          <CategoryGrid />
        </div>
      </section>

      {/* Gaming Features Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-100 to-dark-200"></div>
        <div className="container mx-auto px-4 relative z-10">
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
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">INSTANT PAYMENT</h3>
              <p className="text-dark-600 font-tech">Lightning-fast transactions with Orange Money, Wave, Moov, and international cards</p>
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
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">WARP SPEED DELIVERY</h3>
              <p className="text-dark-600 font-tech">Ultra-fast delivery across West Africa with real-time tracking and secure packaging</p>
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
              <h3 className="text-2xl font-gaming font-bold mb-4 text-dark-800">LEGENDARY QUALITY</h3>
              <p className="text-dark-600 font-tech">Premium new and certified refurbished products with extended warranty protection</p>
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
              READY TO DOMINATE?
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-dark-600 font-tech mb-12 max-w-3xl mx-auto">
            Join thousands of gamers across West Africa who've upgraded their setup with WestTech Gaming
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/products" className="btn-primary text-xl px-10 py-5 font-tech">
              START SHOPPING
            </Link>
            <Link href="/support" className="btn-neon text-xl px-10 py-5 font-tech">
              GET SUPPORT
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}