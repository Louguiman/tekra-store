import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationService } from './validation.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { Supplier } from '../entities/supplier.entity';
import { ValidationNotificationService } from './validation-notification.service';
import { InventoryIntegrationService } from './inventory-integration.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ValidationService', () => {
  let service: ValidationService;
  let submissionRepository: Repository<SupplierSubmission>;
  let supplierRepository: Repository<Supplier>;
  let notificationService: ValidationNotificationService;
  let inventoryIntegrationService: InventoryIntegrationService;
  let auditService: AuditService;

  const mockSubmissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSupplierRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationService = {
    notifyApproval: jest.fn(),
    notifyRejection: jest.fn(),
  };

  const mockInventoryIntegrationService = {
    createProductFromValidation: jest.fn(),
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: ValidationNotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: InventoryIntegrationService,
          useValue: mockInventoryIntegrationService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    submissionRepository = module.get<Repository<SupplierSubmission>>(
      getRepositoryToken(SupplierSubmission),
    );
    supplierRepository = module.get<Repository<Supplier>>(
      getRepositoryToken(Supplier),
    );
    notificationService = module.get<ValidationNotificationService>(
      ValidationNotificationService,
    );
    inventoryIntegrationService = module.get<InventoryIntegrationService>(
      InventoryIntegrationService,
    );
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getPendingValidations', () => {
    it('should return pending validations with pagination', async () => {
      const mockSubmissions = [
        {
          id: '1',
          processingStatus: 'completed',
          validationStatus: 'pending',
          supplier: { id: 'supplier1', name: 'Test Supplier' },
          contentType: 'text',
          originalContent: 'Product details',
          extractedData: [
            {
              name: 'Product 1',
              confidenceScore: 85,
              extractionMetadata: {
                sourceType: 'text',
                processingTime: 100,
                aiModel: 'test',
                extractedFields: ['name'],
              },
            },
          ],
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockSubmissions, 1]),
      };

      mockSubmissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPendingValidations({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('getValidationById', () => {
    it('should return a validation item by id', async () => {
      const mockSubmission = {
        id: '1',
        processingStatus: 'completed',
        validationStatus: 'pending',
        supplier: { id: 'supplier1', name: 'Test Supplier' },
        contentType: 'text',
        originalContent: 'Product details',
        extractedData: [
          {
            name: 'Product 1',
            confidenceScore: 85,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 100,
              aiModel: 'test',
              extractedFields: ['name'],
            },
          },
        ],
        createdAt: new Date(),
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      const result = await service.getValidationById('1-0');

      expect(result.id).toBe('1-0');
      expect(result.submissionId).toBe('1');
      expect(result.extractedProduct.name).toBe('Product 1');
    });

    it('should throw NotFoundException if validation not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.getValidationById('999-0')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveProduct', () => {
    it('should approve a validation item', async () => {
      const mockSubmission = {
        id: '1',
        processingStatus: 'completed',
        validationStatus: 'pending',
        supplier: { id: 'supplier1', name: 'Test Supplier' },
        extractedData: [
          {
            name: 'Product 1',
            confidenceScore: 85,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 100,
              aiModel: 'test',
              extractedFields: ['name'],
            },
          },
        ],
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockSubmissionRepository.save.mockResolvedValue({
        ...mockSubmission,
        validationStatus: 'approved',
        validatedBy: 'admin1',
      });
      mockInventoryIntegrationService.createProductFromValidation.mockResolvedValue({
        id: 'product1',
      });

      await service.approveProduct('1-0', undefined, 'admin1', 'Looks good');

      expect(mockSubmissionRepository.save).toHaveBeenCalled();
      expect(mockInventoryIntegrationService.createProductFromValidation).toHaveBeenCalled();
      expect(mockNotificationService.notifyApproval).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if validation not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.approveProduct('999-0', undefined, 'admin1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectProduct', () => {
    it('should reject a validation item', async () => {
      const mockSubmission = {
        id: '1',
        processingStatus: 'completed',
        validationStatus: 'pending',
        supplier: { id: 'supplier1', name: 'Test Supplier' },
        extractedData: [
          {
            name: 'Product 1',
            confidenceScore: 85,
            extractionMetadata: {
              sourceType: 'text',
              processingTime: 100,
              aiModel: 'test',
              extractedFields: ['name'],
            },
          },
        ],
      };

      const feedback = {
        category: 'extraction_error',
        subcategory: 'incorrect_product_name',
        description: 'Product name is incorrect',
        severity: 'medium',
      };

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockSubmissionRepository.save.mockResolvedValue({
        ...mockSubmission,
        validationStatus: 'rejected',
        validatedBy: 'admin1',
      });

      await service.rejectProduct('1-0', feedback, 'admin1', 'Invalid data');

      expect(mockSubmissionRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.notifyRejection).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });

  describe('getValidationStats', () => {
    it('should return validation statistics', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };

      mockSubmissionRepository.count
        .mockResolvedValueOnce(10) // totalPending
        .mockResolvedValueOnce(50) // totalProcessed
        .mockResolvedValueOnce(40); // approved

      mockSubmissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getValidationStats();

      expect(result.totalPending).toBe(10);
      expect(result.highPriority).toBe(3);
      expect(result.approvalRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getFeedbackCategories', () => {
    it('should return feedback categories', async () => {
      const result = await service.getFeedbackCategories();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('subcategories');
    });
  });
});
