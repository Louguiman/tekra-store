import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { NotificationChannel } from './dto/notification.dto';

describe('Support Contact Availability Property Tests', () => {
  let service: NotificationsService;
  let whatsAppService: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        EmailService,
        SmsService,
        WhatsAppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                EMAIL_API_KEY: 'test-email-key',
                EMAIL_FROM_ADDRESS: 'test@example.com',
                SMS_API_KEY: 'test-sms-key',
                SMS_SENDER_ID: 'TEST',
                WHATSAPP_API_KEY: 'test-whatsapp-key',
                WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
                WHATSAPP_ACCESS_TOKEN: 'test-access-token',
                WHATSAPP_SUPPORT_NUMBER: '+22312345678',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    whatsAppService = module.get<WhatsAppService>(WhatsAppService);
  });

  /**
   * Feature: ecommerce-platform, Property 23: Support Contact Availability
   * 
   * Property: For any page in the system, WhatsApp contact button must be prominently displayed, 
   * and order confirmations must include support contact details.
   * 
   * This property ensures that support contact information is always available to customers
   * and that WhatsApp links are properly generated for customer support.
   */
  describe('Property 23: Support Contact Availability', () => {
    it('should generate valid WhatsApp support links for any order ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.uuid(), { nil: undefined }),
          async (orderId?: string) => {
            // Generate WhatsApp support link
            const link = service.getWhatsAppSupportLink(orderId);

            // Verify that a valid WhatsApp link is generated
            expect(link).toBeDefined();
            expect(typeof link).toBe('string');
            expect(link).toMatch(/^https:\/\/wa\.me\/\d+/);

            // Verify that the link contains the support number
            expect(link).toContain('22312345678'); // Support number without + and spaces

            // If order ID is provided, verify it's included in the message
            if (orderId) {
              expect(link).toContain(encodeURIComponent(orderId));
            }

            // Verify that the link contains a proper message
            expect(link).toContain('text=');
            expect(link).toContain(encodeURIComponent('Bonjour'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid custom WhatsApp links for any phone number and message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`),
          fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          async (phoneNumber: string, message?: string) => {
            // Generate custom WhatsApp link
            const link = service.generateWhatsAppLink(phoneNumber, message);

            // Verify that a valid WhatsApp link is generated
            expect(link).toBeDefined();
            expect(typeof link).toBe('string');
            expect(link).toMatch(/^https:\/\/wa\.me\/\d+/);

            // Verify that the phone number is properly formatted (no + or spaces)
            const formattedNumber = phoneNumber.replace(/[\s+]/g, '');
            expect(link).toContain(formattedNumber);

            // If message is provided, verify it's properly encoded
            if (message) {
              expect(link).toContain('text=');
              expect(link).toContain(encodeURIComponent(message));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle support contact requests with proper acknowledgment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            customerName: fc.string({ minLength: 2, maxLength: 50 }),
            customerContact: fc.oneof(
              fc.emailAddress(),
              fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`)
            ),
            message: fc.string({ minLength: 10, maxLength: 500 }),
            orderId: fc.option(fc.uuid(), { nil: undefined }),
            preferredChannel: fc.constantFrom(NotificationChannel.WHATSAPP, NotificationChannel.EMAIL),
          }),
          async (supportContactData) => {
            // Mock the WhatsApp service
            const whatsAppSpy = jest.spyOn(whatsAppService, 'sendSupportMessage').mockResolvedValue(true);

            // Handle support contact
            const result = await service.handleSupportContact(supportContactData);

            // Verify that the system processes the support contact
            expect(typeof result).toBe('boolean');

            // Verify that appropriate service was called based on preferred channel
            if (supportContactData.preferredChannel === NotificationChannel.WHATSAPP) {
              expect(whatsAppSpy).toHaveBeenCalledWith(
                supportContactData.customerContact,
                expect.stringContaining('Merci pour votre message'),
                supportContactData.orderId
              );
            }

            // Clean up mocks
            whatsAppSpy.mockRestore();
          }
        ),
        { numRuns: 50 } // Reduced iterations for faster execution
      );
    });

    it('should ensure WhatsApp links are properly formatted for all valid phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Mali numbers
            fc.string({ minLength: 8, maxLength: 8 }).map(s => `+223${s.replace(/\D/g, '').padStart(8, '0')}`),
            // Côte d'Ivoire numbers  
            fc.string({ minLength: 8, maxLength: 8 }).map(s => `+225${s.replace(/\D/g, '').padStart(8, '0')}`),
            // Burkina Faso numbers
            fc.string({ minLength: 8, maxLength: 8 }).map(s => `+226${s.replace(/\D/g, '').padStart(8, '0')}`)
          ),
          async (phoneNumber: string) => {
            const message = 'Test support message';
            
            // Generate WhatsApp link
            const link = service.generateWhatsAppLink(phoneNumber, message);

            // Verify link structure
            expect(link).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+$/);
            
            // Verify phone number formatting (should not contain + or spaces)
            const expectedNumber = phoneNumber.replace(/[\s+]/g, '');
            expect(link).toContain(`wa.me/${expectedNumber}`);
            
            // Verify message encoding
            expect(link).toContain(encodeURIComponent(message));
            
            // Verify the link is a valid URL
            expect(() => new URL(link)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide consistent support contact information across all contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.uuid(), { nil: undefined }),
          async (contextOrderId?: string) => {
            // Get support link for different contexts
            const supportLink1 = service.getWhatsAppSupportLink(contextOrderId);
            const supportLink2 = service.getWhatsAppSupportLink(contextOrderId);

            // Verify consistency - same input should produce same output
            expect(supportLink1).toBe(supportLink2);

            // Verify that all support links use the same support number
            const supportNumber = '+22312345678';
            const formattedSupportNumber = supportNumber.replace(/[\s+]/g, '');
            
            expect(supportLink1).toContain(formattedSupportNumber);
            expect(supportLink2).toContain(formattedSupportNumber);

            // Verify that links are always valid URLs
            expect(() => new URL(supportLink1)).not.toThrow();
            expect(() => new URL(supportLink2)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});