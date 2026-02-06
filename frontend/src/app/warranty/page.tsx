'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function WarrantyPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-gaming font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              WARRANTY SHIELD
            </span>
          </h1>
          <p className="text-dark-600 font-tech">Comprehensive warranty coverage for your tech</p>
        </div>

        {/* Content */}
        <div className="card-gaming p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Standard Warranty Coverage
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                All products purchased from WestTech Gaming come with comprehensive warranty protection to ensure 
                your peace of mind.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-lg p-4">
                  <div className="text-3xl font-gaming font-bold text-primary-600 mb-2">12 Months</div>
                  <h3 className="font-bold text-dark-800 mb-1">New Products</h3>
                  <p className="text-sm text-dark-600">Full manufacturer warranty</p>
                </div>
                
                <div className="bg-gradient-to-br from-secondary-50 to-accent-50 border-2 border-secondary-200 rounded-lg p-4">
                  <div className="text-3xl font-gaming font-bold text-secondary-600 mb-2">6 Months</div>
                  <h3 className="font-bold text-dark-800 mb-1">Grade A Refurbished</h3>
                  <p className="text-sm text-dark-600">WestTech warranty</p>
                </div>
                
                <div className="bg-gradient-to-br from-accent-50 to-primary-50 border-2 border-accent-200 rounded-lg p-4">
                  <div className="text-3xl font-gaming font-bold text-accent-600 mb-2">3 Months</div>
                  <h3 className="font-bold text-dark-800 mb-1">Grade B/C Refurbished</h3>
                  <p className="text-sm text-dark-600">WestTech warranty</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              What's Covered
            </h2>
            <div className="space-y-3 text-dark-700 font-tech">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Manufacturing Defects:</strong> Any defects in materials or workmanship under normal use.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Hardware Failures:</strong> Component failures not caused by misuse or accidents.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Software Issues:</strong> Pre-installed software problems (excluding user-installed software).
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Performance Issues:</strong> Products not performing as specified.
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              What's Not Covered
            </h2>
            <div className="space-y-3 text-dark-700 font-tech">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Physical Damage:</strong> Drops, spills, cracks, or other accidental damage.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Misuse or Abuse:</strong> Damage from improper use, modifications, or unauthorized repairs.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Cosmetic Damage:</strong> Scratches, dents, or wear from normal use.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Software Issues:</strong> Problems with user-installed software, viruses, or malware.
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <strong>Consumables:</strong> Batteries, cables, and other consumable items (unless defective).
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              How to Make a Warranty Claim
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Contact Support:</strong> Reach out to our support team with your order number and description of the issue.
                </li>
                <li>
                  <strong>Diagnostic:</strong> Our team will help diagnose the problem and determine if it's covered under warranty.
                </li>
                <li>
                  <strong>Return Authorization:</strong> If covered, we'll provide a return authorization and shipping instructions.
                </li>
                <li>
                  <strong>Inspection:</strong> We'll inspect the product to verify the warranty claim.
                </li>
                <li>
                  <strong>Repair or Replace:</strong> We'll repair or replace the product, typically within 7-14 business days.
                </li>
              </ol>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">Free Shipping</h3>
                <p className="text-blue-800">
                  Warranty repairs and replacements include free shipping both ways within your country.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Extended Warranty Options
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                Upgrade your protection with our extended warranty plans:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-50 border-2 border-primary-200 rounded-lg p-4">
                  <h3 className="font-bold text-dark-800 mb-2">Extended Warranty +1 Year</h3>
                  <p className="text-dark-600 mb-3">Extends your warranty by an additional 12 months</p>
                  <div className="text-2xl font-gaming font-bold text-primary-600">5% of product price</div>
                </div>
                
                <div className="bg-dark-50 border-2 border-secondary-200 rounded-lg p-4">
                  <h3 className="font-bold text-dark-800 mb-2">Accidental Damage Protection</h3>
                  <p className="text-dark-600 mb-3">Covers drops, spills, and accidental damage</p>
                  <div className="text-2xl font-gaming font-bold text-secondary-600">10% of product price</div>
                </div>
              </div>
              
              <p className="text-sm text-dark-600">
                Extended warranty must be purchased within 30 days of your original purchase.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Warranty Terms & Conditions
            </h2>
            <div className="space-y-3 text-dark-700 font-tech text-sm">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Warranty is valid only with proof of purchase from WestTech Gaming</li>
                <li>Warranty is non-transferable and applies only to the original purchaser</li>
                <li>Warranty does not cover data loss - always backup your data</li>
                <li>Repaired or replaced products are covered for the remainder of the original warranty period</li>
                <li>WestTech Gaming reserves the right to replace products with equivalent models if original is unavailable</li>
                <li>Warranty is void if product serial numbers are removed or tampered with</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-gaming font-bold text-dark-800 mb-4">
              Contact Warranty Support
            </h2>
            <div className="space-y-4 text-dark-700 font-tech">
              <p>
                For warranty claims or questions, contact our dedicated warranty support team:
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
                  <a href="mailto:warranty@westtech.com" className="text-primary-500 hover:text-primary-600 font-semibold">
                    warranty@westtech.com
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
