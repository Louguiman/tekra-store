'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CountdownBannerProps {
  title: string;
  subtitle: string;
  endDate: Date;
  ctaText: string;
  ctaLink: string;
}

export function CountdownBanner({ title, subtitle, endDate, ctaText, ctaLink }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500"></div>
      
      {/* Animated rays */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-full bg-white origin-top"
            style={{
              transform: `rotate(${i * 45}deg)`,
              animation: `pulse 2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Flash Sale Badge */}
          <div className="inline-block mb-6 animate-bounce">
            <div className="bg-white text-red-600 font-gaming font-bold px-8 py-3 rounded-full text-xl shadow-2xl">
              ⚡ FLASH SALE ⚡
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-gaming font-bold text-white mb-4 animate-pulse">
            {title}
          </h2>
          
          <p className="text-xl md:text-2xl text-white/90 font-tech mb-8">
            {subtitle}
          </p>

          {/* Countdown Timer */}
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { label: 'DAYS', value: timeLeft.days },
              { label: 'HOURS', value: timeLeft.hours },
              { label: 'MINS', value: timeLeft.minutes },
              { label: 'SECS', value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="bg-white/20 backdrop-blur-md rounded-xl p-6 shadow-2xl">
                <div className="text-4xl md:text-5xl font-gaming font-bold text-white mb-2">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-sm font-tech text-white/80">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <Link 
            href={ctaLink}
            className="inline-block bg-white text-red-600 font-gaming font-bold px-12 py-5 rounded-xl hover:scale-110 transform transition-all duration-300 shadow-2xl hover:shadow-white/50 text-xl animate-pulse"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
