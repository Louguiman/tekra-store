'use client';

import React from 'react';
import { Phone, Mail, MessageCircle, Clock, MapPin, HelpCircle } from 'lucide-react';
import { SupportContact } from '@/components/support/support-contact';
import { WhatsAppButton } from '@/components/support/whatsapp-button';

export default function SupportPage() {
  const faqItems = [
    {
      question: "Comment puis-je suivre ma commande ?",
      answer: "Vous pouvez suivre votre commande en visitant la page 'Mes commandes' ou en utilisant le numéro de commande fourni dans votre email de confirmation."
    },
    {
      question: "Quels sont les modes de paiement acceptés ?",
      answer: "Nous acceptons Orange Money, Wave, Moov Money et les cartes bancaires (Visa/MasterCard) selon votre pays."
    },
    {
      question: "Quelle est la politique de garantie ?",
      answer: "Tous nos produits neufs bénéficient d'une garantie constructeur. Les produits reconditionnés ont une garantie de 6 à 12 mois selon le grade."
    },
    {
      question: "Comment fonctionne la livraison ?",
      answer: "Au Mali, nous livrons avec notre équipe. En Côte d'Ivoire et au Burkina Faso, nous travaillons avec des partenaires logistiques locaux."
    },
    {
      question: "Puis-je retourner un produit ?",
      answer: "Oui, vous avez 14 jours pour retourner un produit non ouvert. Les frais de retour peuvent s'appliquer selon les conditions."
    }
  ];

  const supportChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Réponse rapide via WhatsApp",
      action: "Contacter",
      color: "bg-green-500 hover:bg-green-600",
      component: <WhatsAppButton variant="button" className="w-full" />
    },
    {
      icon: Phone,
      title: "Téléphone",
      description: "Appelez-nous directement",
      action: "Appeler",
      color: "bg-blue-500 hover:bg-blue-600",
      href: "tel:+22312345678"
    },
    {
      icon: Mail,
      title: "Email",
      description: "Envoyez-nous un email",
      action: "Écrire",
      color: "bg-gray-500 hover:bg-gray-600",
      href: "mailto:support@westtech.com"
    }
  ];

  const countryInfo = [
    {
      country: "🇲🇱 Mali",
      phone: "+223 XX XX XX XX",
      hours: "Lun-Ven: 8h-18h",
      delivery: "Livraison par notre équipe"
    },
    {
      country: "🇨🇮 Côte d'Ivoire", 
      phone: "+225 XX XX XX XX",
      hours: "Lun-Ven: 8h-18h",
      delivery: "Points de retrait partenaires"
    },
    {
      country: "🇧🇫 Burkina Faso",
      phone: "+226 XX XX XX XX", 
      hours: "Lun-Ven: 8h-18h",
      delivery: "Points de retrait partenaires"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Centre d'aide</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Nous sommes là pour vous aider. Trouvez des réponses à vos questions ou contactez notre équipe support.
            </p>
          </div>

          {/* Quick Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {supportChannels.map((channel, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className={`w-16 h-16 ${channel.color.split(' ')[0]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <channel.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{channel.title}</h3>
                <p className="text-gray-600 mb-4">{channel.description}</p>
                
                {channel.component ? (
                  channel.component
                ) : (
                  <a
                    href={channel.href}
                    className={`inline-flex items-center justify-center px-6 py-2 ${channel.color} text-white font-medium rounded-lg transition-colors duration-200`}
                  >
                    {channel.action}
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Questions fréquentes</h2>
              </div>
              
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <details key={index} className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="font-medium text-gray-900">{item.question}</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-2 p-4 text-gray-600 bg-white border-l-4 border-blue-500">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <SupportContact className="mb-6" />
              
              {/* Country-Specific Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Support par pays</h3>
                </div>
                
                <div className="space-y-4">
                  {countryInfo.map((info, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{info.country}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{info.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{info.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{info.delivery}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Besoin d'aide supplémentaire ?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Notre équipe support est disponible pour vous aider avec toutes vos questions concernant nos produits, 
              les commandes, la livraison et les garanties.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <WhatsAppButton 
                variant="button" 
                size="md"
                className="px-8 py-3"
                message="Bonjour, j'ai besoin d'aide avec votre service"
              />
              <a
                href="mailto:support@westtech.com"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              >
                <Mail className="w-5 h-5 mr-2" />
                Envoyer un email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}