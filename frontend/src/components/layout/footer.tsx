import Link from 'next/link'
import { WhatsAppButton } from '../support/whatsapp-button'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="font-bold text-xl">WestTech</span>
            </div>
            <p className="text-gray-400 mb-4">
              Premium technology products for West Africa with local payment methods and reliable delivery.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-gray-400 hover:text-white">All Products</Link></li>
              <li><Link href="/categories/premium" className="text-gray-400 hover:text-white">Premium Gaming</Link></li>
              <li><Link href="/categories/mid-range" className="text-gray-400 hover:text-white">Mid-Range</Link></li>
              <li><Link href="/categories/refurbished" className="text-gray-400 hover:text-white">Refurbished</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link href="/support" className="text-gray-400 hover:text-white">Help Center</Link></li>
              <li><Link href="/warranty" className="text-gray-400 hover:text-white">Warranty Policy</Link></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-white">Returns & Refunds</Link></li>
              <li><Link href="/shipping" className="text-gray-400 hover:text-white">Shipping Info</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:support@westtech.com" className="hover:text-white">
                  support@westtech.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+22312345678" className="hover:text-white">
                  +223 XX XX XX XX
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span>💬</span>
                <WhatsAppButton 
                  variant="button" 
                  size="sm" 
                  className="bg-transparent border border-green-500 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1 text-xs"
                />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Available Countries:</p>
              <p className="text-sm text-gray-400">🇲🇱 Mali • 🇨🇮 Côte d'Ivoire • 🇧🇫 Burkina Faso</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 WestTech. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}