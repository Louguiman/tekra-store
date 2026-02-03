import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as fc from 'fast-check';
import { MessageGroupingService } from './message-grouping.service';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { Supplier } from '../entities/supplier.entity';

describe('Feature: whatsapp-supplier-automation, Property 2: Message Grouping Consistency', () => {
  let service: MessageGroupingService;
  let submissionRepository: Repository<SupplierSubmission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageGroupingService,
        {
          provide: getRepositoryToken(SupplierSubmission),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageGroupingService>(MessageGroupingService);
    submissionRepository = module.get<Repository<SupplierSubmission>>(
      getRepositoryToken(SupplierSubmission),
    );
  });

  // Property-based test generators
  const supplierIdGenerator = fc.uuid();
  
  const timestampGenerator = fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31'),
  });

  const supplierSubmissionGenerator = fc.record({
    id: fc.uuid(),
    supplier: fc.record({
      id: supplierIdGenerator,
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }),
    whatsappMessageId: fc.string({ minLength: 10, maxLength: 50 }),
    contentType: fc.constantFrom('text', 'image', 'pdf', 'voice'),
    originalContent: fc.string({ minLength: 1, maxLength: 1000 }),
    mediaUrl: fc.option(fc.string()),
    processingStatus: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
    validationStatus: fc.constantFrom('pending', 'approved', 'rejected'),
    createdAt: timestampGenerator,
    updatedAt: timestampGenerator,
  });

  const messageSequenceGenerator = fc.array(
    fc.record({
      supplierId: supplierIdGenerator,
      timestamp: timestampGenerator,
      messageId: fc.string({ minLength: 10, maxLength: 50 }),
    }),
    { minLength: 1, maxLength: 10 }
  );

  test('Property 2: Message Grouping Consistency - For any sequence of messages from the same supplier within a time window, the system should group them together for batch processing while maintaining chronological order', () => {
    fc.assert(fc.asyncProperty(
      messageSequenceGenerator,
      async (messageSequence) => {
        // Setup mocks
        jest.clearAllMocks();

        // Sort messages by timestamp to ensure chronological order
        const sortedMessages = messageSequence.sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        );

        // Group messages by supplier and time windows (5 minute windows)
        const groupingWindowMs = 5 * 60 * 1000;
        const expectedGroups = new Map<string, any[]>();

        for (const message of sortedMessages) {
          const windowStart = Math.floor(message.timestamp.getTime() / groupingWindowMs) * groupingWindowMs;
          const groupKey = `${message.supplierId}_${windowStart}`;
          
          if (!expectedGroups.has(groupKey)) {
            expectedGroups.set(groupKey, []);
          }
          expectedGroups.get(groupKey)!.push(message);
        }

        // Mock repository responses for each message
        for (let i = 0; i < sortedMessages.length; i++) {
          const currentMessage = sortedMessages[i];
          const cutoffTime = new Date(currentMessage.timestamp.getTime() - groupingWindowMs);
          
          // Find if there's a recent message from the same supplier
          const recentMessage = sortedMessages
            .slice(0, i)
            .reverse()
            .find(msg => 
              msg.supplierId === currentMessage.supplierId &&
              msg.timestamp.getTime() > cutoffTime.getTime()
            );

          const mockRecentSubmission = recentMessage ? {
            id: `submission-${recentMessage.messageId}`,
            supplier: { id: recentMessage.supplierId },
            createdAt: recentMessage.timestamp,
            processingStatus: 'pending',
          } : null;

          (submissionRepository.findOne as jest.Mock)
            .mockResolvedValueOnce(mockRecentSubmission);
        }

        // Test the grouping logic for each message
        for (let i = 0; i < sortedMessages.length; i++) {
          const currentMessage = sortedMessages[i];
          const result = await service.shouldGroupWithExisting(
            currentMessage.supplierId,
            currentMessage.timestamp
          );

          // Find if there should be a grouping based on our expected groups
          const cutoffTime = new Date(currentMessage.timestamp.getTime() - groupingWindowMs);
          const shouldHaveGroup = sortedMessages
            .slice(0, i)
            .some(msg => 
              msg.supplierId === currentMessage.supplierId &&
              msg.timestamp.getTime() > cutoffTime.getTime()
            );

          if (shouldHaveGroup) {
            // Should find an existing group
            expect(result).toBeTruthy();
            if (result) {
              expect(result.supplier.id).toBe(currentMessage.supplierId);
              expect(result.processingStatus).toBe('pending');
            }
          } else {
            // Should not find an existing group (first message or outside window)
            expect(result).toBeNull();
          }
        }

        // Verify chronological order is maintained within groups
        for (const [groupKey, messages] of expectedGroups.entries()) {
          if (messages.length > 1) {
            for (let i = 1; i < messages.length; i++) {
              expect(messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                messages[i - 1].timestamp.getTime()
              );
            }
          }
        }

        // Verify that messages from the same supplier within the time window are grouped
        for (const [groupKey, messages] of expectedGroups.entries()) {
          const [supplierId, windowStart] = groupKey.split('_');
          const windowEnd = parseInt(windowStart) + groupingWindowMs;

          for (const message of messages) {
            expect(message.supplierId).toBe(supplierId);
            expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(parseInt(windowStart));
            expect(message.timestamp.getTime()).toBeLessThan(windowEnd);
          }
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 2 Edge Case: Messages outside grouping window should not be grouped', () => {
    fc.assert(fc.asyncProperty(
      supplierIdGenerator,
      fc.tuple(timestampGenerator, timestampGenerator).map(([t1, t2]) => {
        // Ensure timestamps are far apart (more than 5 minutes)
        const minGap = 6 * 60 * 1000; // 6 minutes
        const laterTime = new Date(Math.max(t1.getTime(), t2.getTime()) + minGap);
        const earlierTime = new Date(Math.min(t1.getTime(), t2.getTime()));
        return [earlierTime, laterTime];
      }),
      async (supplierId, [earlierTime, laterTime]) => {
        jest.clearAllMocks();

        // Mock no recent submission found
        (submissionRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Test that messages far apart in time are not grouped
        const result = await service.shouldGroupWithExisting(supplierId, laterTime);
        
        expect(result).toBeNull();
      }
    ), { numRuns: 50 });
  });

  test('Property 2 Statistics: Submission statistics should be consistent with actual data', () => {
    fc.assert(fc.asyncProperty(
      fc.array(supplierSubmissionGenerator, { minLength: 0, maxLength: 20 }),
      async (submissions) => {
        jest.clearAllMocks();

        // Mock query builder for statistics
        const mockQueryBuilder = {
          getCount: jest.fn(),
          clone: jest.fn(),
          where: jest.fn(),
        };

        // Set up chaining for query builder
        mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
        mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);

        (submissionRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

        // Calculate expected statistics
        const totalSubmissions = submissions.length;
        const pendingSubmissions = submissions.filter(s => s.processingStatus === 'pending').length;
        const processingSubmissions = submissions.filter(s => s.processingStatus === 'processing').length;
        const completedSubmissions = submissions.filter(s => s.processingStatus === 'completed').length;
        const failedSubmissions = submissions.filter(s => s.processingStatus === 'failed').length;

        // Mock the count responses
        mockQueryBuilder.getCount
          .mockResolvedValueOnce(totalSubmissions)
          .mockResolvedValueOnce(pendingSubmissions)
          .mockResolvedValueOnce(processingSubmissions)
          .mockResolvedValueOnce(completedSubmissions)
          .mockResolvedValueOnce(failedSubmissions);

        // Mock getMessageGroups for average group size calculation
        const mockGroups = submissions.length > 0 ? [
          {
            supplierId: 'test-supplier',
            supplierName: 'Test Supplier',
            messages: submissions.slice(0, Math.min(3, submissions.length)).map(s => ({
              ...s,
              extractedData: null,
              validatedBy: null,
              validationNotes: null,
              processingLogs: [],
            })) as SupplierSubmission[],
            groupStartTime: new Date(),
            groupEndTime: new Date(),
            totalMessages: Math.min(3, submissions.length),
          }
        ] : [];

        jest.spyOn(service, 'getMessageGroups').mockResolvedValue(mockGroups);

        const stats = await service.getSubmissionStats();

        // Verify statistics consistency
        expect(stats.totalSubmissions).toBe(totalSubmissions);
        expect(stats.pendingSubmissions).toBe(pendingSubmissions);
        expect(stats.processingSubmissions).toBe(processingSubmissions);
        expect(stats.completedSubmissions).toBe(completedSubmissions);
        expect(stats.failedSubmissions).toBe(failedSubmissions);

        // Verify that all status counts sum to total
        const statusSum = stats.pendingSubmissions + stats.processingSubmissions + 
                         stats.completedSubmissions + stats.failedSubmissions;
        expect(statusSum).toBe(stats.totalSubmissions);

        // Verify average group size is reasonable
        expect(stats.averageGroupSize).toBeGreaterThanOrEqual(0);
        if (mockGroups.length > 0) {
          const expectedAverage = mockGroups.reduce((sum, group) => sum + group.totalMessages, 0) / mockGroups.length;
          expect(stats.averageGroupSize).toBeCloseTo(expectedAverage, 2);
        }
      }
    ), { numRuns: 50 });
  });
});