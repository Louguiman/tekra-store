'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReturnsPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-gaming font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              RETURNS & REFUNDS
            </span>
          </h1>
          <p className="text-dark-600 font-tech">Our return and refund policy</p>
        </div>

        {/* Content */}
        <div className="card-gaming p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Return Policy
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                We want you to be completely satisfied with your purchase. If you're not happy with your order, 
                we offer a hassle-free return policy.
              </p>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">30-Day Return Window</h3>
                <p className="text-blue-800">
                  You have 30 days from the date of delivery to return your item for a full refund or exchange.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Return Conditions
            </h2>
            <div className="space-y-3 text-dark-700 font-tech">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Unused Condition:</strong> Items must be in their original, unused condition with all tags and packaging intact.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Original Packaging:</strong> Products must be returned in their original packaging with all accessories and manuals.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Proof of Purchase:</strong> You must provide your order number and proof of purchase.
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              How to Return
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Contact Support:</strong> Reach out to our customer support team via WhatsApp or email with your order number.
                </li>
                <li>
                  <strong>Return Authorization:</strong> We'll provide you with a return authorization number and instructions.
                </li>
                <li>
                  <strong>Package Your Item:</strong> Securely package the item with all original contents.
                </li>
                <li>
                  <strong>Ship or Drop Off:</strong> Ship the item back to us or drop it off at one of our locations.
                </li>
                <li>
                  <strong>Refund Processing:</strong> Once we receive and inspect your return, we'll process your refund within 5-7 business days.
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Refund Policy
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                Refunds will be issued to your original payment method. Please note:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Mobile money refunds: 1-3 business days</li>
                <li>Card refunds: 5-10 business days</li>
                <li>Cash on delivery returns: Refund via mobile money or store credit</li>
              </ul>
              
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <h3 className="font-bold text-yellow-900 mb-2">Shipping Costs</h3>
                <p className="text-yellow-800">
                  Original shipping costs are non-refundable. Return shipping costs are the responsibility of the customer 
                  unless the return is due to our error or a defective product.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Exchanges
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                If you'd like to exchange an item for a different size, color, or model, please contact our support team. 
                We'll arrange the exchange and cover any price differences.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Non-Returnable Items
            </h2>
            <div className="space-y-3 text-dark-700 font-tech">
              <p>The following items cannot be returned:</p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Opened software or digital products</li>
                <li>Items marked as "Final Sale" or "Clearance"</li>
                <li>Gift cards</li>
                <li>Personalized or custom-made items</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Damaged or Defective Items
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                If you receive a damaged or defective item, please contact us immediately with photos of the damage. 
                We'll arrange for a replacement or full refund at no cost to you, including return shipping.
              </p>
              
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-2">Report Within 48 Hours</h3>
                <p className="text-red-800">
                  Damage or defects must be reported within 48 hours of delivery to qualify for free return shipping.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Contact Us
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                For any questions about returns or refunds, please contact our customer support team:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-50 border-2 border-dark-200 rounded-lg p-4">
                  <h3 className="font-bold text-dark-800 mb-2">WhatsApp Support</h3>
                  <p className="text-dark-600">Available 24/7</p>
                  <Link href="/support" className="text-primary-500 hover:text-primary-600 font-semibold">
                    Contact via WhatsApp →
                  </Link>
                </div>
                
                <div className="bg-dark-50 border-2 border-dark-200 rounded-lg p-4">
                  <h3 className="font-bold text-dark-800 mb-2">Email Support</h3>
                  <p className="text-dark-600">Response within 24 hours</p>
                  <a href="mailto:support@westtech.com" className="text-primary-500 hover:text-primary-600 font-semibold">
                    support@westtech.com
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Back Button */}
          <div className="pt-6 border-t border-dark-200">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-tech font-semibold transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
