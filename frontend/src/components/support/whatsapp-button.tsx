'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  orderId?: string;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'floating' | 'inline' | 'button';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  orderId,
  message,
  className = '',
  size = 'md',
  variant = 'button',
}) => {
  const generateWhatsAppLink = () => {
    const supportNumber = '+22312345678'; // This should come from config
    let defaultMessage = 'Bonjour, j\'ai besoin d\'aide concernant';
    
    if (orderId) {
      defaultMessage += ` ma commande ${orderId}`;
    } else {
      defaultMessage += ' votre service';
    }
    
    const finalMessage = message || defaultMessage;
    const encodedMessage = encodeURIComponent(finalMessage);
    
    return `https://wa.me/${supportNumber.replace(/[\s+]/g, '')}?text=${encodedMessage}`;
  };

  const handleClick = () => {
    const link = generateWhatsAppLink();
    window.open(link, '_blank');
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const variantClasses = {
    floating: `fixed bottom-4 right-4 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg ${sizeClasses[size]} flex items-center justify-center transition-all duration-200 hover:scale-110`,
    inline: `bg-green-500 hover:bg-green-600 text-white rounded-full ${sizeClasses[size]} flex items-center justify-center transition-colors duration-200`,
    button: `bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`,
  };

  return (
    <button
      onClick={handleClick}
      className={`${variantClasses[variant]} ${className}`}
      title="Contacter le support WhatsApp"
      aria-label="Contacter le support WhatsApp"
    >
      <MessageCircle className={variant === 'button' ? 'w-5 h-5' : 'w-full h-full p-1'} />
      {variant === 'button' && (
        <span className="font-medium">
          Support WhatsApp
        </span>
      )}
    </button>
  );
};

export default WhatsAppButton;