'use client'

import Link from 'next/link'
import { ProductSegment } from '@/store/api'

const categories = [
  {
    segment: ProductSegment.PREMIUM,
    title: 'Premium Gaming',
    description: 'High-end gaming laptops, desktops, and accessories for the ultimate gaming experience',
    href: '/categories/premium',
    icon: '🎮',
    color: 'from-purple-500 to-pink-500',
  },
  {
    segment: ProductSegment.MID_RANGE,
    title: 'Mid-Range',
    description: 'Quality technology products that balance performance and affordability',
    href: '/categories/mid-range',
    icon: '💻',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    segment: ProductSegment.REFURBISHED,
    title: 'Refurbished',
    description: 'Certified refurbished products with warranty - great value for money',
    href: '/categories/refurbished',
    icon: '♻️',
    color: 'from-green-500 to-emerald-500',
  },
]

export function CategoryGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {categories.map((category) => (
        <Link
          key={category.segment}
          href={category.href}
          className="group block"
        >
          <div className="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-200">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-5 group-hover:opacity-10 transition-opacity duration-200`} />
            
            <div className="relative p-8">
              {/* Icon */}
              <div className="text-4xl mb-4">{category.icon}</div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                {category.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                {category.description}
              </p>
              
              {/* CTA */}
              <div className="flex items-center text-primary-600 font-medium group-hover:text-primary-700">
                <span>Browse Products</span>
                <svg 
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}