'use client';

import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { WhatsAppButton } from './whatsapp-button';

interface SupportContactProps {
  orderId?: string;
  className?: string;
}

export const SupportContact: React.FC<SupportContactProps> = ({
  orderId,
  className = '',
}) => {
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
    preferredChannel: 'whatsapp' as 'whatsapp' | 'email',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/notifications/support-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: formData.name,
          customerContact: formData.contact,
          message: formData.message,
          orderId,
          preferredChannel: formData.preferredChannel,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', contact: '', message: '', preferredChannel: 'whatsapp' });
        setTimeout(() => {
          setIsContactFormOpen(false);
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit support contact:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Besoin d'aide ?</h3>
      </div>

      <div className="space-y-4">
        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <WhatsAppButton
            orderId={orderId}
            variant="button"
            size="sm"
            className="w-full justify-center"
          />
          
          <a
            href="tel:+22312345678"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 text-sm"
          >
            <Phone className="w-4 h-4" />
            <span className="font-medium">Appeler</span>
          </a>
          
          <button
            onClick={() => setIsContactFormOpen(!isContactFormOpen)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 text-sm"
          >
            <Mail className="w-4 h-4" />
            <span className="font-medium">Email</span>
          </button>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>+223 XX XX XX XX</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>support@ecommerce.com</span>
            </div>
          </div>
          <p className="mt-2 text-xs">
            Disponible du lundi au vendredi, 8h-18h (GMT)
          </p>
        </div>

        {/* Contact Form */}
        {isContactFormOpen && (
          <div className="border-t pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact (Email ou Téléphone)
                  </label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="preferredChannel" className="block text-sm font-medium text-gray-700 mb-1">
                  Canal de réponse préféré
                </label>
                <select
                  id="preferredChannel"
                  name="preferredChannel"
                  value={formData.preferredChannel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez votre problème ou votre question..."
                />
              </div>

              {orderId && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Commande associée:</strong> {orderId}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsContactFormOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </div>

              {submitStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800">
                    ✅ Message envoyé avec succès ! Nous vous répondrons bientôt.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    ❌ Erreur lors de l'envoi. Veuillez réessayer ou nous contacter directement.
                  </p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportContact;