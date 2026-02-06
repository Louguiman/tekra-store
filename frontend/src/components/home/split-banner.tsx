'use client';

import Link from 'next/link';

interface SplitBannerProps {
  leftTitle: string;
  leftSubtitle: string;
  leftCta: string;
  leftLink: string;
  leftGradient: string;
  rightTitle: string;
  rightSubtitle: string;
  rightCta: string;
  rightLink: string;
  rightGradient: string;
}

export function SplitBanner({
  leftTitle,
  leftSubtitle,
  leftCta,
  leftLink,
  leftGradient,
  rightTitle,
  rightSubtitle,
  rightCta,
  rightLink,
  rightGradient,
}: SplitBannerProps) {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Banner */}
          <Link href={leftLink} className="group">
            <div className={`relative overflow-hidden rounded-2xl p-12 min-h-[300px] flex flex-col justify-center bg-gradient-to-br ${leftGradient} hover:scale-[1.02] transform transition-all duration-300 shadow-xl hover:shadow-2xl`}>
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-4">
                  {leftTitle}
                </h3>
                <p className="text-lg text-white/90 font-tech mb-6">
                  {leftSubtitle}
                </p>
                <span className="inline-flex items-center gap-2 bg-white text-dark-800 font-gaming font-bold px-6 py-3 rounded-lg group-hover:gap-4 transition-all duration-300">
                  {leftCta}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </span>
              </div>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-white/20 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-white/20 rounded-bl-2xl"></div>
            </div>
          </Link>

          {/* Right Banner */}
          <Link href={rightLink} className="group">
            <div className={`relative overflow-hidden rounded-2xl p-12 min-h-[300px] flex flex-col justify-center bg-gradient-to-br ${rightGradient} hover:scale-[1.02] transform transition-all duration-300 shadow-xl hover:shadow-2xl`}>
              {/* Animated background elements */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-4">
                  {rightTitle}
                </h3>
                <p className="text-lg text-white/90 font-tech mb-6">
                  {rightSubtitle}
                </p>
                <span className="inline-flex items-center gap-2 bg-white text-dark-800 font-gaming font-bold px-6 py-3 rounded-lg group-hover:gap-4 transition-all duration-300">
                  {rightCta}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </span>
              </div>

              {/* Decorative corner */}
              <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-white/20 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-white/20 rounded-br-2xl"></div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
