import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { WhatsappService, WhatsAppWebhookPayload } from './whatsapp.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService } from './media-storage.service';
import { MessageGroupingService } from './message-grouping.service';
import { Supplier } from '../entities/supplier.entity';

describe('Feature: whatsapp-supplier-automation, Property 1: Message Processing Completeness', () => {
  let service: WhatsappService;
  let submissionRepository: Repository<SupplierSubmission>;
  let processingLogRepository: Repository<ProcessingLog>;
  let suppliersService: SuppliersService;
  let auditService: AuditService;
  let mediaStorageService: MediaStorageService;
  let messageGroupingService: MessageGroupingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProcessingLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: SuppliersService,
          useValue: {
            findByPhoneNumber: jest.fn(),
            findOne: jest.fn(),
            updateMetrics: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
        {
          provide: MediaStorageService,
          useValue: {
            downloadMediaFromWhatsApp: jest.fn(),
          },
        },
        {
          provide: MessageGroupingService,
          useValue: {
            shouldGroupWithExisting: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    submissionRepository = module.get<Repository<SupplierSubmission>>(
      getRepositoryToken(SupplierSubmission),
    );
    processingLogRepository = module.get<Repository<ProcessingLog>>(
      getRepositoryToken(ProcessingLog),
    );
    suppliersService = module.get<SuppliersService>(SuppliersService);
    auditService = module.get<AuditService>(AuditService);
    mediaStorageService = module.get<MediaStorageService>(MediaStorageService);
    messageGroupingService = module.get<MessageGroupingService>(MessageGroupingService);
  });

  // Property-based test generators
  const phoneNumberGenerator = fc.string({ minLength: 10, maxLength: 15 }).map(s => 
    '+' + s.replace(/[^0-9]/g, '').slice(0, 14)
  );

  const messageTypeGenerator = fc.constantFrom('text', 'image', 'document', 'audio');

  const whatsAppMessageGenerator = fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    from: phoneNumberGenerator,
    timestamp: fc.integer({ min: 1600000000, max: 2000000000 }).map(t => t.toString()),
    type: messageTypeGenerator,
    text: fc.option(fc.record({ body: fc.string({ minLength: 1, maxLength: 1000 }) })),
    image: fc.option(fc.record({
      id: fc.string({ minLength: 10, maxLength: 50 }),
      mime_type: fc.constant('image/jpeg'),
      sha256: fc.string({ minLength: 64, maxLength: 64 }),
    })),
    document: fc.option(fc.record({
      id: fc.string({ minLength: 10, maxLength: 50 }),
      mime_type: fc.constant('application/pdf'),
      sha256: fc.string({ minLength: 64, maxLength: 64 }),
      filename: fc.string({ minLength: 1, maxLength: 100 }),
    })),
    audio: fc.option(fc.record({
      id: fc.string({ minLength: 10, maxLength: 50 }),
      mime_type: fc.constant('audio/ogg'),
      sha256: fc.string({ minLength: 64, maxLength: 64 }),
    })),
  });

  const webhookPayloadGenerator = fc.record({
    object: fc.constant('whatsapp_business_account'),
    entry: fc.array(fc.record({
      id: fc.string({ minLength: 10, maxLength: 50 }),
      changes: fc.array(fc.record({
        value: fc.record({
          messaging_product: fc.constant('whatsapp'),
          metadata: fc.record({
            phone_number_id: fc.string({ minLength: 10, maxLength: 20 }),
          }),
          messages: fc.option(fc.array(whatsAppMessageGenerator, { minLength: 1, maxLength: 3 })),
        }),
        field: fc.constant('messages'),
      }), { minLength: 1, maxLength: 2 }),
    }), { minLength: 1, maxLength: 2 }),
  });

  const supplierGenerator = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    phoneNumber: phoneNumberGenerator,
    countryCode: fc.string({ minLength: 2, maxLength: 2 }),
    isActive: fc.boolean(),
    performanceMetrics: fc.record({
      totalSubmissions: fc.integer({ min: 0, max: 1000 }),
      approvedSubmissions: fc.integer({ min: 0, max: 1000 }),
      averageConfidenceScore: fc.float({ min: 0, max: 100 }),
      averageProcessingTime: fc.float({ min: 0, max: 10000 }),
      lastSubmissionDate: fc.date(),
      qualityRating: fc.integer({ min: 1, max: 5 }),
    }),
    preferredCategories: fc.array(fc.string(), { maxLength: 5 }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
    submissions: fc.constant([]),
  });

  test('Property 1: Message Processing Completeness - For any WhatsApp message, the webhook handler should successfully receive, authenticate the supplier, and queue the message for processing within the specified time limits', () => {
    fc.assert(fc.asyncProperty(
      webhookPayloadGenerator,
      supplierGenerator,
      async (payload, supplier) => {
        // Setup mocks
        jest.clearAllMocks();
        
        // Mock supplier authentication - only succeed if supplier is active
        (suppliersService.findByPhoneNumber as jest.Mock).mockImplementation(async (phoneNumber: string) => {
          const message = payload.entry[0]?.changes[0]?.value?.messages?.[0];
          if (message && message.from === phoneNumber && supplier.isActive) {
            return supplier;
          }
          return null;
        });

        // Mock submission creation
        const mockSubmission = {
          id: 'test-submission-id',
          supplier: { id: supplier.id },
          whatsappMessageId: 'test-message-id',
          contentType: 'text',
          originalContent: 'test content',
          mediaUrl: null,
          processingStatus: 'pending',
          validationStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (submissionRepository.create as jest.Mock).mockReturnValue(mockSubmission);
        (submissionRepository.save as jest.Mock).mockResolvedValue(mockSubmission);

        // Mock processing log creation
        (processingLogRepository.create as jest.Mock).mockReturnValue({});
        (processingLogRepository.save as jest.Mock).mockResolvedValue({});

        // Mock audit service
        (auditService.logAction as jest.Mock).mockResolvedValue(undefined);

        // Mock message grouping
        (messageGroupingService.shouldGroupWithExisting as jest.Mock).mockResolvedValue(null);

        // Mock media storage (for non-text messages)
        (mediaStorageService.downloadMediaFromWhatsApp as jest.Mock).mockResolvedValue({
          id: 'media-id',
          originalName: 'test-file.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          localPath: './uploads/test-file.jpg',
          sha256: 'test-hash',
          downloadedAt: new Date(),
        });

        // Mock supplier metrics update
        (suppliersService.findOne as jest.Mock).mockResolvedValue(supplier);
        (suppliersService.updateMetrics as jest.Mock).mockResolvedValue(supplier);

        // Execute the test
        const startTime = Date.now();
        const result = await service.processIncomingMessage(payload);
        const processingTime = Date.now() - startTime;

        // Validate the property: Message processing completeness
        if (payload.entry.length > 0 && 
            payload.entry[0].changes.length > 0 && 
            payload.entry[0].changes[0].value.messages &&
            payload.entry[0].changes[0].value.messages.length > 0) {
          
          const message = payload.entry[0].changes[0].value.messages[0];
          
          if (supplier.isActive) {
            // For active suppliers, processing should succeed
            expect(result.processed).toBe(true);
            expect(result.supplierAuthenticated).toBe(true);
            expect(result.submissionId).toBeDefined();
            expect(result.processingTime).toBeLessThan(30000); // Within 30 seconds
            expect(processingTime).toBeLessThan(30000);
            
            // Verify submission was created
            expect(submissionRepository.create).toHaveBeenCalled();
            expect(submissionRepository.save).toHaveBeenCalled();
            
            // Verify audit logging
            expect(auditService.logAction).toHaveBeenCalled();
            
            // Verify processing logs were created
            expect(processingLogRepository.create).toHaveBeenCalled();
            expect(processingLogRepository.save).toHaveBeenCalled();
          } else {
            // For inactive suppliers, processing should fail with proper authentication
            expect(result.processed).toBe(false);
            expect(result.supplierAuthenticated).toBe(false);
            expect(result.error).toContain('not registered or inactive');
          }
        } else {
          // For invalid payloads, processing should fail gracefully
          expect(result.processed).toBe(false);
          expect(result.supplierAuthenticated).toBe(false);
          expect(result.error).toContain('No valid message found');
        }

        // Processing time should always be reasonable
        expect(result.processingTime).toBeGreaterThanOrEqual(0);
        expect(result.processingTime).toBeLessThan(30000);
      }
    ), { numRuns: 100 });
  });

  test('Property 1 Security: Webhook signature validation should work correctly', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 10, maxLength: 100 }),
      fc.string({ minLength: 10, maxLength: 1000 }),
      (signature, payload) => {
        // Mock environment variable
        process.env.WHATSAPP_WEBHOOK_SECRET = 'test-secret';

        // Test signature validation
        const isValid = service.validateWebhookSignature(`sha256=${signature}`, payload);
        
        // Should return boolean result without throwing
        expect(typeof isValid).toBe('boolean');
        
        // Clean up
        delete process.env.WHATSAPP_WEBHOOK_SECRET;
      }
    ), { numRuns: 50 });
  });
});