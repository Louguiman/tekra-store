import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { OrderStatusNotificationDto } from './dto/notification.dto';

describe('Order Status Notifications Property Tests', () => {
  let service: NotificationsService;
  let emailService: EmailService;
  let smsService: SmsService;
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
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    whatsAppService = module.get<WhatsAppService>(WhatsAppService);
  });

  /**
   * Feature: ecommerce-platform, Property 12: Order Status Notifications
   * 
   * Property: For any order status change, the system must notify the customer of the status update.
   * 
   * This property ensures that whenever an order status changes, appropriate notifications
   * are sent through available channels (email, SMS, WhatsApp) and the system handles
   * both successful and failed notification attempts gracefully.
   */
  describe('Property 12: Order Status Notifications', () => {
    it('should send notifications for any valid order status change', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid order status notification data
          fc.record({
            orderId: fc.uuid(),
            orderNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `ORD-${s}`),
            newStatus: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
            customerEmail: fc.emailAddress(),
            customerPhone: fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`),
            trackingNumber: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: undefined }),
          }),
          async (notificationData: OrderStatusNotificationDto) => {
            // Mock the individual service methods to track calls
            const emailSpy = jest.spyOn(emailService, 'sendOrderStatusEmail').mockResolvedValue(true);
            const smsSpy = jest.spyOn(smsService, 'sendOrderStatusSms').mockResolvedValue(true);
            const whatsAppSpy = jest.spyOn(whatsAppService, 'sendOrderStatusWhatsApp').mockResolvedValue(true);

            // Execute the notification
            const result = await service.sendOrderStatusNotification(notificationData);

            // Verify that the result contains status for all channels
            expect(result).toHaveProperty('email');
            expect(result).toHaveProperty('sms');
            expect(result).toHaveProperty('whatsapp');
            expect(typeof result.email).toBe('boolean');
            expect(typeof result.sms).toBe('boolean');
            expect(typeof result.whatsapp).toBe('boolean');

            // Verify that all notification services were called with correct parameters
            expect(emailSpy).toHaveBeenCalledWith(
              notificationData.customerEmail,
              notificationData.orderNumber,
              notificationData.newStatus,
              notificationData.trackingNumber,
            );

            expect(smsSpy).toHaveBeenCalledWith(
              notificationData.customerPhone,
              notificationData.orderNumber,
              notificationData.newStatus,
              notificationData.trackingNumber,
            );

            expect(whatsAppSpy).toHaveBeenCalledWith(
              notificationData.customerPhone,
              notificationData.orderNumber,
              notificationData.newStatus,
              undefined, // customer name not provided in current implementation
              notificationData.trackingNumber,
            );

            // Clean up mocks
            emailSpy.mockRestore();
            smsSpy.mockRestore();
            whatsAppSpy.mockRestore();
          }
        ),
        { numRuns: 20 } // Reduced iterations to prevent timeout
      );
    });

    it('should handle notification failures gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.uuid(),
            orderNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `ORD-${s}`),
            newStatus: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
            customerEmail: fc.emailAddress(),
            customerPhone: fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`),
            trackingNumber: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: undefined }),
          }),
          // Generate random failure scenarios
          fc.record({
            emailFails: fc.boolean(),
            smsFails: fc.boolean(),
            whatsAppFails: fc.boolean(),
          }),
          async (notificationData: OrderStatusNotificationDto, failureScenario) => {
            // Mock services with potential failures
            const emailSpy = jest.spyOn(emailService, 'sendOrderStatusEmail')
              .mockResolvedValue(!failureScenario.emailFails);
            const smsSpy = jest.spyOn(smsService, 'sendOrderStatusSms')
              .mockResolvedValue(!failureScenario.smsFails);
            const whatsAppSpy = jest.spyOn(whatsAppService, 'sendOrderStatusWhatsApp')
              .mockResolvedValue(!failureScenario.whatsAppFails);

            // Execute the notification
            const result = await service.sendOrderStatusNotification(notificationData);

            // Verify that the system doesn't crash and returns appropriate results
            expect(result).toHaveProperty('email');
            expect(result).toHaveProperty('sms');
            expect(result).toHaveProperty('whatsapp');
            
            // Verify that the results match the expected failure scenarios
            expect(result.email).toBe(!failureScenario.emailFails);
            expect(result.sms).toBe(!failureScenario.smsFails);
            expect(result.whatsapp).toBe(!failureScenario.whatsAppFails);

            // Clean up mocks
            emailSpy.mockRestore();
            smsSpy.mockRestore();
            whatsAppSpy.mockRestore();
          }
        ),
        { numRuns: 20 } // Reduced iterations to prevent timeout
      );
    });

    it('should handle missing contact information gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.uuid(),
            orderNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `ORD-${s}`),
            newStatus: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
            customerEmail: fc.option(fc.emailAddress(), { nil: '' }),
            customerPhone: fc.option(fc.string({ minLength: 8, maxLength: 15 }).map(s => `+223${s.replace(/\D/g, '').slice(0, 8)}`), { nil: '' }),
            trackingNumber: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: undefined }),
          }),
          async (notificationData: OrderStatusNotificationDto) => {
            // Mock the individual service methods
            const emailSpy = jest.spyOn(emailService, 'sendOrderStatusEmail').mockResolvedValue(true);
            const smsSpy = jest.spyOn(smsService, 'sendOrderStatusSms').mockResolvedValue(true);
            const whatsAppSpy = jest.spyOn(whatsAppService, 'sendOrderStatusWhatsApp').mockResolvedValue(true);

            // Execute the notification
            const result = await service.sendOrderStatusNotification(notificationData);

            // Verify that the system handles missing contact info appropriately
            if (notificationData.customerEmail) {
              expect(emailSpy).toHaveBeenCalled();
            } else {
              expect(emailSpy).not.toHaveBeenCalled();
              expect(result.email).toBe(false);
            }

            if (notificationData.customerPhone) {
              expect(smsSpy).toHaveBeenCalled();
              expect(whatsAppSpy).toHaveBeenCalled();
            } else {
              expect(smsSpy).not.toHaveBeenCalled();
              expect(whatsAppSpy).not.toHaveBeenCalled();
              expect(result.sms).toBe(false);
              expect(result.whatsapp).toBe(false);
            }

            // Clean up mocks
            emailSpy.mockRestore();
            smsSpy.mockRestore();
            whatsAppSpy.mockRestore();
          }
        ),
        { numRuns: 20 } // Reduced iterations to prevent timeout
      );
    });
  });
});