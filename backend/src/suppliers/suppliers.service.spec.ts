import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuppliersService } from './suppliers.service';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { AuditService } from '../audit/audit.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepository: Repository<Supplier>;
  let submissionRepository: Repository<SupplierSubmission>;
  let processingLogRepository: Repository<ProcessingLog>;
  let auditService: AuditService;

  const mockSupplier: Supplier = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Supplier',
    phoneNumber: '+233123456789',
    countryCode: 'GH',
    isActive: true,
    email: 'test@supplier.com',
    contactPerson: 'John Doe',
    performanceMetrics: {
      totalSubmissions: 10,
      approvedSubmissions: 8,
      averageConfidenceScore: 85,
      averageProcessingTime: 5000,
      lastSubmissionDate: new Date(),
      qualityRating: 4,
    },
    preferredCategories: ['electronics'],
    createdAt: new Date(),
    updatedAt: new Date(),
    submissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProcessingLog),
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    submissionRepository = module.get<Repository<SupplierSubmission>>(getRepositoryToken(SupplierSubmission));
    processingLogRepository = module.get<Repository<ProcessingLog>>(getRepositoryToken(ProcessingLog));
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new supplier with valid data', async () => {
      const createDto = {
        name: 'Test Supplier',
        phoneNumber: '+233123456789',
        countryCode: 'GH',
        email: 'test@supplier.com',
        contactPerson: 'John Doe',
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.create).toHaveBeenCalled();
      expect(supplierRepository.save).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('should throw ConflictException if phone number already exists', async () => {
      const createDto = {
        name: 'Test Supplier',
        phoneNumber: '+233123456789',
        countryCode: 'GH',
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid phone number', async () => {
      const createDto = {
        name: 'Test Supplier',
        phoneNumber: 'invalid',
        countryCode: 'GH',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid country code', async () => {
      const createDto = {
        name: 'Test Supplier',
        phoneNumber: '+233123456789',
        countryCode: 'XX',
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSupplierPrivileges', () => {
    it('should return gold tier privileges for high-performing supplier', () => {
      const goldSupplier = {
        ...mockSupplier,
        performanceMetrics: {
          totalSubmissions: 100,
          approvedSubmissions: 85,
          averageConfidenceScore: 90,
          averageProcessingTime: 3000,
          lastSubmissionDate: new Date(),
          qualityRating: 5,
        },
      };

      const privileges = service.getSupplierPrivileges(goldSupplier);

      expect(privileges.expeditedProcessing).toBe(true);
      expect(privileges.autoApprovalEnabled).toBe(true);
      expect(privileges.autoApprovalThreshold).toBe(85);
      expect(privileges.priorityLevel).toBe(5);
      expect(privileges.maxDailySubmissions).toBe(200);
      expect(privileges.requiresManualReview).toBe(false);
    });

    it('should return new tier privileges for suppliers with few submissions', () => {
      const newSupplier = {
        ...mockSupplier,
        performanceMetrics: {
          totalSubmissions: 5,
          approvedSubmissions: 3,
          averageConfidenceScore: 70,
          averageProcessingTime: 5000,
          lastSubmissionDate: new Date(),
          qualityRating: 3,
        },
      };

      const privileges = service.getSupplierPrivileges(newSupplier);

      expect(privileges.expeditedProcessing).toBe(false);
      expect(privileges.autoApprovalEnabled).toBe(false);
      expect(privileges.priorityLevel).toBe(1);
      expect(privileges.maxDailySubmissions).toBe(50);
      expect(privileges.requiresManualReview).toBe(true);
    });
  });

  describe('qualifiesForAutoApproval', () => {
    it('should return true for gold tier supplier with high confidence', async () => {
      const goldSupplier = {
        ...mockSupplier,
        performanceMetrics: {
          totalSubmissions: 100,
          approvedSubmissions: 85,
          averageConfidenceScore: 90,
          averageProcessingTime: 3000,
          lastSubmissionDate: new Date(),
          qualityRating: 5,
        },
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(goldSupplier);

      const result = await service.qualifiesForAutoApproval(mockSupplier.id, 90);

      expect(result).toBe(true);
    });

    it('should return false for new supplier', async () => {
      const newSupplier = {
        ...mockSupplier,
        performanceMetrics: {
          totalSubmissions: 5,
          approvedSubmissions: 3,
          averageConfidenceScore: 70,
          averageProcessingTime: 5000,
          lastSubmissionDate: new Date(),
          qualityRating: 3,
        },
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(newSupplier);

      const result = await service.qualifiesForAutoApproval(mockSupplier.id, 95);

      expect(result).toBe(false);
    });
  });

  describe('checkDailySubmissionLimit', () => {
    it('should return allowed true when under limit', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier);
      jest.spyOn(submissionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.checkDailySubmissionLimit(mockSupplier.id);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should return allowed false when at limit', async () => {
      // Mock supplier is gold tier with 200 daily submission limit
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(200),
      };

      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier);
      jest.spyOn(submissionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.checkDailySubmissionLimit(mockSupplier.id);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('authenticateSupplier', () => {
    it('should authenticate and log action for valid supplier', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier);

      const result = await service.authenticateSupplier(mockSupplier.phoneNumber);

      expect(result).toEqual(mockSupplier);
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('should return null for non-existent supplier', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);

      const result = await service.authenticateSupplier('+233999999999');

      expect(result).toBeNull();
    });
  });
});
