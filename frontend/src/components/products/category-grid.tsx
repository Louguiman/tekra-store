'use client'

import Link from 'next/link'
import { ProductSegment } from '@/store/api'

const categories = [
  {
    segment: ProductSegment.PREMIUM,
    title: 'ELITE GAMING',
    description: 'Legendary gaming rigs, ultra-high-end laptops, and pro-grade accessories for champions',
    href: '/categories/premium',
    icon: '⚡',
    gradient: 'from-primary-500 via-secondary-500 to-accent-500',
    glowColor: 'primary-500',
    bgPattern: 'gaming-gradient',
  },
  {
    segment: ProductSegment.MID_RANGE,
    title: 'CORE GAMING',
    description: 'Balanced performance gaming setups that deliver solid FPS without breaking the bank',
    href: '/categories/mid-range',
    icon: '🎯',
    gradient: 'from-secondary-500 via-accent-500 to-primary-500',
    glowColor: 'secondary-500',
    bgPattern: 'neon-gradient',
  },
  {
    segment: ProductSegment.REFURBISHED,
    title: 'RENEWED ARSENAL',
    description: 'Battle-tested gaming gear with certified quality and extended warranty protection',
    href: '/categories/refurbished',
    icon: '🔄',
    gradient: 'from-accent-500 via-primary-500 to-secondary-500',
    glowColor: 'accent-500',
    bgPattern: 'cyber-grid',
  },
]

export function CategoryGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {categories.map((category, index) => (
        <Link
          key={category.segment}
          href={category.href}
          className="group block"
        >
          <div className="card-gaming hover-lift hover-glow relative overflow-hidden h-full">
            {/* Gaming Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className={`w-full h-full ${category.bgPattern}`}></div>
            </div>
            
            {/* Animated Glow Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-all duration-500`}></div>
            
            <div className="relative p-8 h-full flex flex-col">
              {/* Gaming Icon with Glow */}
              <div className="relative mb-6">
                <div className={`text-6xl mb-2 filter drop-shadow-lg animate-float`} style={{ animationDelay: `${index * 0.5}s` }}>
                  {category.icon}
                </div>
                <div className={`absolute top-0 left-0 text-6xl opacity-50 blur-sm animate-pulse text-${category.glowColor}`}>
                  {category.icon}
                </div>
              </div>
              
              {/* Gaming Title */}
              <h3 className="text-2xl font-gaming font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 group-hover:from-secondary-400 group-hover:to-accent-400 transition-all duration-300">
                {category.title}
              </h3>
              
              {/* Gaming Description */}
              <p className="text-dark-600 mb-8 leading-relaxed font-tech flex-grow">
                {category.description}
              </p>
              
              {/* Gaming CTA Button */}
              <div className="relative">
                <div className="flex items-center justify-between p-4 bg-dark-200/30 rounded-xl border border-dark-300/30 group-hover:border-primary-500/50 transition-all duration-300">
                  <span className="font-tech font-semibold text-dark-800 group-hover:text-primary-500 transition-colors duration-300">
                    ENTER ARENA
                  </span>
                  <div className="relative">
                    <svg 
                      className="w-6 h-6 text-primary-500 group-hover:text-secondary-500 group-hover:translate-x-2 transition-all duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="absolute inset-0 bg-primary-500 rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                  </div>
                </div>
                
                {/* Gaming Button Glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
              </div>
            </div>

            {/* Gaming Corner Accents */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary-500/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-secondary-500/20 to-transparent"></div>
            
            {/* Gaming Particle Effects */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-secondary-500 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </Link>
      ))}
    </div>
  )
}