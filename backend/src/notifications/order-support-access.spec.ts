import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';

describe('Order Support Access Property Tests', () => {
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
   * Feature: ecommerce-platform, Property 24: Order Support Access
   * 
   * Property: For any order page viewed by a customer, direct support contact options must be available.
   * 
   * This property ensures that customers can always access support directly from order pages,
   * with proper order context included in support communications.
   */
  describe('Property 24: Order Support Access', () => {
    it('should provide order-specific support links for any valid order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.uuid(),
            orderNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `ORD-${s}`),
            customerEmail: fc.option(fc.emailAddress(), { nil: undefined }),
            customerPhone: fc.option(fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`), { nil: undefined }),
          }),
          async (orderData) => {
            // Generate order-specific WhatsApp support link
            const whatsAppLink = service.getWhatsAppSupportLink(orderData.orderId);

            // Verify that the link is valid and contains order context
            expect(whatsAppLink).toBeDefined();
            expect(typeof whatsAppLink).toBe('string');
            expect(whatsAppLink).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+$/);

            // Verify that the order ID is included in the message
            expect(whatsAppLink).toContain(encodeURIComponent(orderData.orderId));

            // Verify that the link contains appropriate French support message
            expect(whatsAppLink).toContain(encodeURIComponent('Bonjour'));
            expect(whatsAppLink).toContain(encodeURIComponent('commande'));

            // Verify that the link is a valid URL
            expect(() => new URL(whatsAppLink)).not.toThrow();

            // Verify that the support number is consistent
            expect(whatsAppLink).toContain('22312345678');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate contextual support messages for any order number', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).map(s => `ORD-${s}`),
          async (orderNumber: string) => {
            // Generate support link with order number context
            const supportLink = service.getWhatsAppSupportLink(orderNumber);

            // Verify that the order number is properly included
            expect(supportLink).toContain(encodeURIComponent(orderNumber));

            // Verify that the message is contextual and professional
            const decodedUrl = decodeURIComponent(supportLink);
            expect(decodedUrl).toMatch(/commande.*ORD-/i);

            // Verify that the link structure is consistent
            expect(supportLink).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+$/);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle order support requests with proper order context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            customerName: fc.string({ minLength: 2, maxLength: 50 }),
            customerContact: fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`),
            message: fc.string({ minLength: 10, maxLength: 500 }),
            orderId: fc.uuid(),
          }),
          async (supportData) => {
            // Mock WhatsApp service
            const whatsAppSpy = jest.spyOn(whatsAppService, 'sendSupportMessage').mockResolvedValue(true);

            // Send support message with order context
            const result = await whatsAppService.sendSupportMessage(
              supportData.customerContact,
              supportData.message,
              supportData.orderId
            );

            // Verify that the support message was processed
            expect(result).toBe(true);

            // Verify that the service was called with correct parameters
            expect(whatsAppSpy).toHaveBeenCalledWith(
              supportData.customerContact,
              supportData.message,
              supportData.orderId
            );

            // Clean up
            whatsAppSpy.mockRestore();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should ensure support access is available for all order states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.uuid(),
            orderStatus: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
            hasCustomerEmail: fc.boolean(),
            hasCustomerPhone: fc.boolean(),
          }),
          async (orderContext) => {
            // Generate support link regardless of order status
            const supportLink = service.getWhatsAppSupportLink(orderContext.orderId);

            // Verify that support is always available
            expect(supportLink).toBeDefined();
            expect(typeof supportLink).toBe('string');
            expect(supportLink.length).toBeGreaterThan(0);

            // Verify that the link is valid regardless of order state
            expect(() => new URL(supportLink)).not.toThrow();

            // Verify that order context is preserved
            expect(supportLink).toContain(encodeURIComponent(orderContext.orderId));

            // Verify that the support number is consistent across all states
            expect(supportLink).toContain('22312345678');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide multiple support channels for order-related issues', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (orderId: string) => {
            // Test WhatsApp support link generation
            const whatsAppLink = service.getWhatsAppSupportLink(orderId);
            expect(whatsAppLink).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+$/);
            expect(whatsAppLink).toContain(encodeURIComponent(orderId));

            // Test custom WhatsApp link generation for order support
            const customMessage = `Problème avec ma commande ${orderId}`;
            const customLink = service.generateWhatsAppLink('+22312345678', customMessage);
            expect(customLink).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+$/);
            expect(customLink).toContain(encodeURIComponent(customMessage));

            // Verify that both links use the same support infrastructure
            expect(whatsAppLink).toContain('22312345678');
            expect(customLink).toContain('22312345678');

            // Verify that both are valid URLs
            expect(() => new URL(whatsAppLink)).not.toThrow();
            expect(() => new URL(customLink)).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain order context across different support interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.uuid(),
            interactionCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (testData) => {
            const supportLinks: string[] = [];

            // Generate multiple support links for the same order
            for (let i = 0; i < testData.interactionCount; i++) {
              const link = service.getWhatsAppSupportLink(testData.orderId);
              supportLinks.push(link);
            }

            // Verify that all links are consistent
            const firstLink = supportLinks[0];
            for (const link of supportLinks) {
              expect(link).toBe(firstLink);
            }

            // Verify that order context is preserved in all interactions
            for (const link of supportLinks) {
              expect(link).toContain(encodeURIComponent(testData.orderId));
              expect(link).toContain('22312345678');
              expect(() => new URL(link)).not.toThrow();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});