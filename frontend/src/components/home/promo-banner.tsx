'use client';

import Link from 'next/link';

interface PromoBannerProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'neon';
  icon?: React.ReactNode;
}

export function PromoBanner({ 
  title, 
  subtitle, 
  ctaText, 
  ctaLink, 
  variant = 'primary',
  icon 
}: PromoBannerProps) {
  const gradients = {
    primary: 'from-primary-600 via-primary-500 to-secondary-600',
    secondary: 'from-secondary-600 via-secondary-500 to-accent-600',
    accent: 'from-accent-600 via-accent-500 to-primary-600',
    neon: 'from-neon-blue via-primary-500 to-secondary-500',
  };

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradients[variant]} opacity-90`}></div>
      
      {/* Animated particles */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {icon && (
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                {icon}
              </div>
            </div>
          )}
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-gaming font-bold text-white mb-6 animate-fade-in">
            {title}
          </h2>
          
          <p className="text-xl md:text-2xl text-white/90 font-tech mb-8 max-w-3xl mx-auto animate-slide-up">
            {subtitle}
          </p>
          
          <Link 
            href={ctaLink}
            className="inline-block bg-white text-dark-800 font-gaming font-bold px-10 py-5 rounded-xl hover:scale-105 transform transition-all duration-300 shadow-2xl hover:shadow-white/50 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            {ctaText}
          </Link>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-dark-50" fillOpacity="0.3"/>
        </svg>
      </div>
    </section>
  );
}
