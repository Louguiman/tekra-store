'use client';

import React from 'react';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import { WhatsAppButton } from './whatsapp-button';

interface SupportInfoProps {
  variant?: 'compact' | 'full';
  showCountryInfo?: boolean;
  className?: string;
}

export const SupportInfo: React.FC<SupportInfoProps> = ({
  variant = 'compact',
  showCountryInfo = false,
  className = '',
}) => {
  const contactInfo = {
    phone: '+223 XX XX XX XX',
    email: 'support@westtech.com',
    hours: 'Lun-Ven: 8h-18h (GMT)',
  };

  const countryInfo = [
    {
      country: '🇲🇱 Mali',
      phone: '+223 XX XX XX XX',
      hours: 'Lun-Ven: 8h-18h',
      delivery: 'Livraison par notre équipe',
    },
    {
      country: '🇨🇮 Côte d\'Ivoire',
      phone: '+225 XX XX XX XX',
      hours: 'Lun-Ven: 8h-18h',
      delivery: 'Points de retrait partenaires',
    },
    {
      country: '🇧🇫 Burkina Faso',
      phone: '+226 XX XX XX XX',
      hours: 'Lun-Ven: 8h-18h',
      delivery: 'Points de retrait partenaires',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <h4 className="font-medium text-gray-900 mb-3">Support client</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4" />
            <a href={`tel:${contactInfo.phone}`} className="hover:text-blue-600">
              {contactInfo.phone}
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-600">
              {contactInfo.email}
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{contactInfo.hours}</span>
          </div>
        </div>
        <div className="mt-3">
          <WhatsAppButton 
            variant="button" 
            size="sm" 
            className="w-full text-sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contactez notre support</h3>
      
      {/* Main Contact Info */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Téléphone</p>
            <a href={`tel:${contactInfo.phone}`} className="text-blue-600 hover:text-blue-800">
              {contactInfo.phone}
            </a>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Email</p>
            <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:text-blue-800">
              {contactInfo.email}
            </a>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Horaires</p>
            <p className="text-gray-600">{contactInfo.hours}</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Button */}
      <div className="mb-6">
        <WhatsAppButton 
          variant="button" 
          size="md" 
          className="w-full"
        />
      </div>

      {/* Country-Specific Information */}
      {showCountryInfo && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">Support par pays</h4>
          </div>
          <div className="space-y-3">
            {countryInfo.map((info, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 text-sm mb-1">{info.country}</h5>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{info.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{info.hours}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{info.delivery}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportInfo;