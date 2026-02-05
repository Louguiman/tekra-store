import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ErrorRecoveryService } from './error-recovery.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { AuditService } from '../audit/audit.service';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let mockSubmissionRepository: any;
  let mockProcessingLogRepository: any;
  let mockDataSource: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockSubmissionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    mockProcessingLogRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          save: jest.fn(),
          create: jest.fn(),
        },
      })),
    };

    mockAuditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorRecoveryService,
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(ProcessingLog),
          useValue: mockProcessingLogRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ErrorRecoveryService>(ErrorRecoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.executeWithRetry(operation, 'test-operation');
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await service.executeWithRetry(
        operation, 
        'test-operation',
        { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 }
      );
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const result = await service.executeWithRetry(
        operation, 
        'test-operation',
        { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Persistent failure');
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('queueFailedOperation', () => {
    it('should add operation to queue', async () => {
      const operationId = await service.queueFailedOperation(
        'ai_extraction',
        new Error('Test error'),
        'submission-123',
        { test: 'metadata' }
      );
      
      expect(operationId).toBeDefined();
      expect(operationId).toContain('ai_extraction');
      
      const operations = service.getFailedOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].operationType).toBe('ai_extraction');
      expect(operations[0].submissionId).toBe('submission-123');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });

  describe('getQueueStatistics', () => {
    it('should return correct statistics', async () => {
      await service.queueFailedOperation('ai_extraction', new Error('Error 1'), 'sub-1');
      await service.queueFailedOperation('webhook', new Error('Error 2'), 'sub-2');
      await service.queueFailedOperation('ai_extraction', new Error('Error 3'), 'sub-3');
      
      const stats = service.getQueueStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byType['ai_extraction']).toBe(2);
      expect(stats.byType['webhook']).toBe(1);
    });
  });

  describe('executeInTransaction', () => {
    it('should commit transaction on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.executeInTransaction(operation, 'test-transaction');
      
      expect(result).toBe('success');
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      
      await expect(
        service.executeInTransaction(operation, 'test-transaction')
      ).rejects.toThrow('Transaction failed');
      
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });

  describe('retryFailedSubmission', () => {
    it('should reset submission to pending', async () => {
      const mockSubmission = {
        id: 'sub-123',
        processingStatus: 'failed',
      };
      
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockSubmissionRepository.save.mockResolvedValue(mockSubmission);
      
      const result = await service.retryFailedSubmission('sub-123');
      
      expect(result.success).toBe(true);
      expect(mockSubmissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        relations: ['supplier'],
      });
      expect(mockSubmissionRepository.save).toHaveBeenCalled();
    });

    it('should handle submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);
      
      const result = await service.retryFailedSubmission('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('markSubmissionAsFailed', () => {
    it('should mark submission as permanently failed', async () => {
      const mockSubmission = {
        id: 'sub-123',
        processingStatus: 'processing',
      };
      
      const queryRunner = mockDataSource.createQueryRunner();
      queryRunner.manager.findOne.mockResolvedValue(mockSubmission);
      queryRunner.manager.save.mockResolvedValue(mockSubmission);
      queryRunner.manager.create.mockReturnValue({});
      
      await service.markSubmissionAsFailed('sub-123', 'Max retries exceeded');
      
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });
});
