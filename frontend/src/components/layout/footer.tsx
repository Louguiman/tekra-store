import Link from 'next/link'
import { WhatsAppButton } from '../support/whatsapp-button'

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-dark-100 to-dark-200 text-dark-800 overflow-hidden">
      {/* Gaming grid background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      
      {/* Animated elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl animate-pulse-slow"></div>
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-secondary-500/10 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Gaming Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-gaming font-bold text-xl">W</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-gaming font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  WestTech
                </span>
                <span className="text-xs text-neon-blue font-tech tracking-wider">GAMING</span>
              </div>
            </div>
            <p className="text-dark-600 mb-6 font-tech">
              Leveling up West Africa's gaming experience with premium technology products, lightning-fast delivery, and legendary support.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-3 bg-dark-200/50 rounded-xl border border-dark-300/50 hover:border-primary-500/50 transition-all duration-300 hover:bg-dark-200/70 group">
                <svg className="w-5 h-5 text-dark-600 group-hover:text-primary-500 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="p-3 bg-dark-200/50 rounded-xl border border-dark-300/50 hover:border-primary-500/50 transition-all duration-300 hover:bg-dark-200/70 group">
                <svg className="w-5 h-5 text-dark-600 group-hover:text-primary-500 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="p-3 bg-dark-200/50 rounded-xl border border-dark-300/50 hover:border-primary-500/50 transition-all duration-300 hover:bg-dark-200/70 group">
                <svg className="w-5 h-5 text-dark-600 group-hover:text-primary-500 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Gaming Arsenal */}
          <div>
            <h3 className="font-gaming font-bold text-xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
              GAMING ARSENAL
            </h3>
            <ul className="space-y-3">
              <li><Link href="/products" className="text-dark-600 hover:text-primary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-primary-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                All Products
              </Link></li>
              <li><Link href="/categories/premium" className="text-dark-600 hover:text-primary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-secondary-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                Premium Gaming
              </Link></li>
              <li><Link href="/categories/mid-range" className="text-dark-600 hover:text-primary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-accent-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                Mid-Range Tech
              </Link></li>
              <li><Link href="/categories/refurbished" className="text-dark-600 hover:text-primary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-neon-blue rounded-full mr-3 group-hover:animate-pulse"></span>
                Refurbished Gear
              </Link></li>
            </ul>
          </div>

          {/* Gaming Support */}
          <div>
            <h3 className="font-gaming font-bold text-xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-accent-500">
              PLAYER SUPPORT
            </h3>
            <ul className="space-y-3">
              <li><Link href="/support" className="text-dark-600 hover:text-secondary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-primary-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                Help Center
              </Link></li>
              <li><Link href="/warranty" className="text-dark-600 hover:text-secondary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-secondary-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                Warranty Shield
              </Link></li>
              <li><Link href="/returns" className="text-dark-600 hover:text-secondary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-accent-500 rounded-full mr-3 group-hover:animate-pulse"></span>
                Returns & Refunds
              </Link></li>
              <li><Link href="/shipping" className="text-dark-600 hover:text-secondary-500 font-tech transition-colors duration-300 flex items-center group">
                <span className="w-2 h-2 bg-neon-blue rounded-full mr-3 group-hover:animate-pulse"></span>
                Delivery Intel
              </Link></li>
            </ul>
          </div>

          {/* Gaming Contact */}
          <div>
            <h3 className="font-gaming font-bold text-xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-primary-500">
              CONNECT
            </h3>
            <div className="space-y-4 text-dark-600">
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-dark-200/50 rounded-lg border border-dark-300/50 group-hover:border-primary-500/50 transition-all duration-300">
                  <span className="text-lg">📧</span>
                </div>
                <a href="mailto:support@westtech.com" className="hover:text-primary-500 font-tech transition-colors duration-300">
                  support@westtech.com
                </a>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-dark-200/50 rounded-lg border border-dark-300/50 group-hover:border-secondary-500/50 transition-all duration-300">
                  <span className="text-lg">📞</span>
                </div>
                <a href="tel:+22312345678" className="hover:text-secondary-500 font-tech transition-colors duration-300">
                  +223 XX XX XX XX
                </a>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-dark-200/50 rounded-lg border border-dark-300/50">
                  <span className="text-lg">💬</span>
                </div>
                <WhatsAppButton 
                  variant="button" 
                  size="sm" 
                  className="bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-white px-4 py-2 text-sm font-tech transition-all duration-300"
                />
              </div>
            </div>
            
            {/* Gaming Regions */}
            <div className="mt-8">
              <p className="text-sm font-gaming font-semibold text-dark-600 mb-3">GAMING REGIONS:</p>
              <div className="space-y-2 text-sm font-tech">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇲🇱</span>
                  <span className="text-dark-600">Mali - Elite Gaming Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇮</span>
                  <span className="text-dark-600">Côte d'Ivoire - Pro Gaming Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇧🇫</span>
                  <span className="text-dark-600">Burkina Faso - Gaming Frontier</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gaming Footer Bottom */}
        <div className="border-t border-dark-300/30 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-600 font-tech text-center md:text-left">
              &copy; 2024 WestTech Gaming. All rights reserved. 
              <span className="text-blue-400 ml-2">Level up responsibly.</span>
            </p>
            <div className="flex items-center gap-6 text-sm font-tech">
              <Link href="/privacy" className="text-dark-600 hover:text-primary-500 transition-colors duration-300">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-dark-600 hover:text-primary-500 transition-colors duration-300">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-dark-600 hover:text-primary-500 transition-colors duration-300">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}