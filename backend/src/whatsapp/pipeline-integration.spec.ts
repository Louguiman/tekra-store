import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import { WhatsappService } from './whatsapp.service';
import { ValidationService } from '../admin/validation.service';
import { InventoryIntegrationService } from '../admin/inventory-integration.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { Supplier } from '../entities/supplier.entity';
import { AuditService } from '../audit/audit.service';
import { ErrorRecoveryService } from './error-recovery.service';
import { HealthMonitoringService } from './health-monitoring.service';

/**
 * Integration tests for the complete WhatsApp to Inventory pipeline
 * 
 * Tests the end-to-end flow:
 * 1. WhatsApp message reception
 * 2. AI processing and extraction
 * 3. Human validation (or auto-approval)
 * 4. Inventory integration
 * 
 * Requirements: All requirements (complete pipeline integration)
 */
describe('Pipeline Integration Tests', () => {
  let service: PipelineOrchestratorService;
  let whatsappService: WhatsappService;
  let validationService: ValidationService;
  let inventoryService: InventoryIntegrationService;
  let submissionRepository: Repository<SupplierSubmission>;

  const mockSubmissionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  };

  const mockWhatsappService = {
    processSubmissionWithAI: jest.fn(),
  };

  const mockValidationService = {
    approveProduct: jest.fn(),
  };

  const mockInventoryService = {
    createProductFromValidation: jest.fn(),
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  const mockErrorRecoveryService = {
    executeWithRetry: jest.fn(),
  };

  const mockHealthMonitoringService = {
    recordCriticalError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineOrchestratorService,
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: WhatsappService,
          useValue: mockWhatsappService,
        },
        {
          provide: ValidationService,
          useValue: mockValidationService,
        },
        {
          provide: InventoryIntegrationService,
          useValue: mockInventoryService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ErrorRecoveryService,
          useValue: mockErrorRecoveryService,
        },
        {
          provide: HealthMonitoringService,
          useValue: mockHealthMonitoringService,
        },
      ],
    }).compile();

    service = module.get<PipelineOrchestratorService>(PipelineOrchestratorService);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    validationService = module.get<ValidationService>(ValidationService);
    inventoryService = module.get<InventoryIntegrationService>(InventoryIntegrationService);
    submissionRepository = module.get<Repository<SupplierSubmission>>(
      getRepositoryToken(SupplierSubmission),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Complete Pipeline Flow', () => {
    it('should process a submission through the complete pipeline with auto-approval', async () => {
      // Arrange: Create a mock submission with high-confidence extraction
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-123',
        processingStatus: 'pending',
        validationStatus: 'pending',
        contentType: 'text',
        originalContent: 'iPhone 13 Pro 256GB - $999 - Qty: 10',
        extractedData: [
          {
            name: 'iPhone 13 Pro 256GB',
            brand: 'Apple',
            category: 'Smartphones',
            condition: 'new',
            price: 999,
            currency: 'USD',
            quantity: 10,
            confidenceScore: 95,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 1500,
              aiModel: 'llama-3.2-1b',
              extractedFields: ['name', 'brand', 'price', 'quantity'],
            },
          },
        ],
        supplier: {
          id: 'supplier-456',
          name: 'Tech Supplier Inc',
          phoneNumber: '+1234567890',
          performanceMetrics: {
            totalSubmissions: 50,
            approvedSubmissions: 48,
            averageConfidenceScore: 92,
            averageProcessingTime: 2000,
            lastSubmissionDate: new Date(),
            qualityRating: 4.8,
          },
        } as Supplier,
      };

      // Mock repository responses
      mockSubmissionRepository.findOne
        .mockResolvedValueOnce(mockSubmission) // First call - before AI processing
        .mockResolvedValueOnce({ // Second call - after AI processing
          ...mockSubmission,
          processingStatus: 'completed',
        });
      mockWhatsappService.processSubmissionWithAI.mockImplementation(async () => {
        // Simulate AI processing updating the submission
        mockSubmission.processingStatus = 'completed';
      });
      mockInventoryService.createProductFromValidation.mockResolvedValue({
        id: 'product-789',
        name: 'iPhone 13 Pro 256GB',
      });

      // Act: Process the submission through the pipeline
      await service.processSubmissionPipeline('submission-123');

      // Assert: Verify AI processing was called
      expect(mockWhatsappService.processSubmissionWithAI).toHaveBeenCalledWith('submission-123');

      // Assert: Verify inventory integration was called (auto-approval)
      expect(mockInventoryService.createProductFromValidation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iPhone 13 Pro 256GB',
          validatedBy: 'system-auto-approval',
        }),
        'supplier-456',
        'submission-123',
      );

      // Assert: Verify audit logging
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'submission-123',
          success: true,
        }),
      );
    });

    it('should queue submission for human validation when confidence is low', async () => {
      // Arrange: Create a mock submission with low-confidence extraction
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-456',
        processingStatus: 'pending',
        validationStatus: 'pending',
        contentType: 'image',
        originalContent: 'Image: media-123',
        mediaUrl: '/uploads/whatsapp/media-123.jpg',
        extractedData: [
          {
            name: 'Gaming Laptop',
            category: 'Laptops',
            condition: 'refurbished',
            grade: 'B',
            price: 799,
            currency: 'USD',
            quantity: 5,
            confidenceScore: 65, // Low confidence
            extractionMetadata: {
              sourceType: 'image',
              processingTime: 3500,
              aiModel: 'llama-3.2-1b',
              extractedFields: ['name', 'category', 'condition', 'price'],
            },
          },
        ],
        supplier: {
          id: 'supplier-789',
          name: 'Gaming Gear Supplier',
          phoneNumber: '+9876543210',
          performanceMetrics: {
            totalSubmissions: 15,
            approvedSubmissions: 12,
            averageConfidenceScore: 75,
            averageProcessingTime: 3000,
            lastSubmissionDate: new Date(),
            qualityRating: 4.0,
          },
        } as Supplier,
      };

      // Mock repository responses
      mockSubmissionRepository.findOne
        .mockResolvedValueOnce(mockSubmission) // First call - before AI processing
        .mockResolvedValueOnce({ // Second call - after AI processing
          ...mockSubmission,
          processingStatus: 'completed',
        });
      mockWhatsappService.processSubmissionWithAI.mockImplementation(async () => {
        // Simulate AI processing updating the submission
        mockSubmission.processingStatus = 'completed';
      });

      // Act: Process the submission through the pipeline
      await service.processSubmissionPipeline('submission-456');

      // Assert: Verify AI processing was called
      expect(mockWhatsappService.processSubmissionWithAI).toHaveBeenCalledWith('submission-456');

      // Assert: Verify inventory integration was NOT called (requires human validation)
      expect(mockInventoryService.createProductFromValidation).not.toHaveBeenCalled();

      // Assert: Submission should remain in pending validation status
      expect(mockSubmission.validationStatus).toBe('pending');
    });

    it('should handle AI processing failures gracefully', async () => {
      // Arrange: Create a mock submission
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-789',
        processingStatus: 'pending',
        validationStatus: 'pending',
        contentType: 'pdf',
        originalContent: 'Document: catalog.pdf',
        mediaUrl: '/uploads/whatsapp/catalog.pdf',
        supplier: {
          id: 'supplier-123',
          name: 'Office Supplies Co',
          phoneNumber: '+1122334455',
        } as Supplier,
      };

      // Mock repository responses
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockWhatsappService.processSubmissionWithAI.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      // Act & Assert: Expect error to be thrown
      await expect(service.processSubmissionPipeline('submission-789')).rejects.toThrow(
        'AI service unavailable',
      );

      // Assert: Verify error was logged
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'submission-789',
          success: false,
        }),
      );

      // Assert: Verify critical error was recorded
      expect(mockHealthMonitoringService.recordCriticalError).toHaveBeenCalledWith(
        'pipeline-processing',
        expect.stringContaining('AI service unavailable'),
        'high',
        expect.any(Object),
      );
    });
  });

  describe('Pipeline Statistics', () => {
    it('should return accurate pipeline statistics', async () => {
      // Arrange: Mock repository counts
      mockSubmissionRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending processing
        .mockResolvedValueOnce(5) // processing in progress
        .mockResolvedValueOnce(75) // completed processing
        .mockResolvedValueOnce(10) // failed processing
        .mockResolvedValueOnce(20) // pending validation
        .mockResolvedValueOnce(60) // approved validation
        .mockResolvedValueOnce(15); // rejected validation

      // Act: Get pipeline statistics
      const stats = await service.getPipelineStats();

      // Assert: Verify statistics structure
      expect(stats).toEqual({
        total: 100,
        processing: {
          pending: 10,
          inProgress: 5,
          completed: 75,
          failed: 10,
        },
        validation: {
          pending: 20,
          approved: 60,
          rejected: 15,
        },
        approvalRate: '60.00%',
      });
    });
  });

  describe('Auto-Approval Logic', () => {
    it('should auto-approve submissions from trusted suppliers with high confidence', async () => {
      // Arrange: Create a trusted supplier submission
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-auto-1',
        processingStatus: 'completed',
        validationStatus: 'pending',
        extractedData: [
          {
            name: 'MacBook Pro 16"',
            brand: 'Apple',
            category: 'Laptops',
            condition: 'new',
            price: 2499,
            currency: 'USD',
            quantity: 3,
            confidenceScore: 98,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 1200,
              aiModel: 'llama-3.2-1b',
              extractedFields: ['name', 'brand', 'category', 'price', 'quantity'],
            },
          },
        ],
        supplier: {
          id: 'supplier-trusted',
          name: 'Premium Tech Supplier',
          phoneNumber: '+1111111111',
          performanceMetrics: {
            totalSubmissions: 100,
            approvedSubmissions: 95,
            averageConfidenceScore: 94,
            averageProcessingTime: 1500,
            lastSubmissionDate: new Date(),
            qualityRating: 4.9,
          },
        } as Supplier,
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockInventoryService.createProductFromValidation.mockResolvedValue({
        id: 'product-auto-1',
        name: 'MacBook Pro 16"',
      });

      // Act: Process the submission
      await service.processSubmissionPipeline('submission-auto-1');

      // Assert: Verify auto-approval occurred
      expect(mockInventoryService.createProductFromValidation).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auto_approve',
          success: true,
        }),
      );
    });

    it('should not auto-approve submissions from new suppliers', async () => {
      // Arrange: Create a new supplier submission
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-new-1',
        processingStatus: 'completed',
        validationStatus: 'pending',
        extractedData: [
          {
            name: 'Gaming Mouse',
            brand: 'Logitech',
            category: 'Accessories',
            condition: 'new',
            price: 79,
            currency: 'USD',
            quantity: 20,
            confidenceScore: 95,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 1000,
              aiModel: 'llama-3.2-1b',
              extractedFields: ['name', 'brand', 'category', 'price', 'quantity'],
            },
          },
        ],
        supplier: {
          id: 'supplier-new',
          name: 'New Supplier',
          phoneNumber: '+2222222222',
          performanceMetrics: {
            totalSubmissions: 3, // Too few submissions
            approvedSubmissions: 3,
            averageConfidenceScore: 90,
            averageProcessingTime: 2000,
            lastSubmissionDate: new Date(),
            qualityRating: 5.0,
          },
        } as Supplier,
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      // Act: Process the submission
      await service.processSubmissionPipeline('submission-new-1');

      // Assert: Verify auto-approval did NOT occur
      expect(mockInventoryService.createProductFromValidation).not.toHaveBeenCalled();
    });
  });

  describe('Reprocessing Failed Submissions', () => {
    it('should reset and reprocess a failed submission', async () => {
      // Arrange: Create a failed submission
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-failed-1',
        processingStatus: 'failed',
        validationStatus: 'pending',
        contentType: 'text',
        originalContent: 'Product data',
        extractedData: null,
        supplier: {
          id: 'supplier-123',
          name: 'Test Supplier',
          phoneNumber: '+3333333333',
        } as Supplier,
      };

      let savedSubmission: any = null;

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockSubmissionRepository.save.mockImplementation(async (submission) => {
        savedSubmission = { ...submission };
        return submission;
      });
      mockWhatsappService.processSubmissionWithAI.mockImplementation(async () => {
        // Simulate AI processing updating the submission
        mockSubmission.processingStatus = 'completed';
        mockSubmission.extractedData = [
          {
            name: 'Test Product',
            confidenceScore: 85,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 1000,
              aiModel: 'test',
              extractedFields: ['name'],
            },
          },
        ];
      });

      // Act: Reprocess the failed submission
      await service.reprocessFailedSubmission('submission-failed-1');

      // Assert: Verify submission was reset to pending (captured in savedSubmission)
      expect(savedSubmission).toMatchObject({
        processingStatus: 'pending',
        extractedData: null,
      });

      // Assert: Verify AI processing was triggered
      expect(mockWhatsappService.processSubmissionWithAI).toHaveBeenCalledWith('submission-failed-1');
    });

    it('should throw error when trying to reprocess non-failed submission', async () => {
      // Arrange: Create a completed submission
      const mockSubmission: Partial<SupplierSubmission> = {
        id: 'submission-completed-1',
        processingStatus: 'completed',
        validationStatus: 'pending',
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      // Act & Assert: Expect error to be thrown
      await expect(service.reprocessFailedSubmission('submission-completed-1')).rejects.toThrow(
        'is not in failed status',
      );
    });
  });
});
