'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'accent' | 'neon'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const variantClasses = {
  primary: 'border-primary-500',
  secondary: 'border-secondary-500',
  accent: 'border-accent-500',
  neon: 'border-blue-400',
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* Gaming Loading Ring */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full border-2 border-transparent ${variantClasses[variant]} border-t-transparent animate-spin`}></div>
        
        {/* Inner glow */}
        <div className={`absolute inset-1 rounded-full border border-transparent ${variantClasses[variant]} opacity-50 animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        
        {/* Center dot */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`w-1 h-1 rounded-full bg-primary-500 animate-pulse`}></div>
        </div>
      </div>
      
      {/* Gaming particles */}
      <div className="absolute">
        <div className={`w-1 h-1 bg-primary-500 rounded-full animate-ping opacity-75`} style={{ animationDelay: '0s' }}></div>
      </div>
      <div className="absolute">
        <div className={`w-1 h-1 bg-primary-400 rounded-full animate-ping opacity-50`} style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  )
}