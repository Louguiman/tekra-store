import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SupplierSubmission } from '../entities/supplier-submission.entity';

export interface MessageGroup {
  supplierId: string;
  supplierName: string;
  messages: SupplierSubmission[];
  groupStartTime: Date;
  groupEndTime: Date;
  totalMessages: number;
}

@Injectable()
export class MessageGroupingService {
  private readonly groupingWindowMs = 5 * 60 * 1000; // 5 minutes grouping window

  constructor(
    @InjectRepository(SupplierSubmission)
    private submissionRepository: Repository<SupplierSubmission>,
  ) {}

  async shouldGroupWithExisting(supplierId: string, messageTimestamp: Date): Promise<SupplierSubmission | null> {
    // Find the most recent submission from this supplier within the grouping window
    const cutoffTime = new Date(messageTimestamp.getTime() - this.groupingWindowMs);
    
    const recentSubmission = await this.submissionRepository.findOne({
      where: {
        supplier: { id: supplierId },
        createdAt: MoreThan(cutoffTime),
        processingStatus: 'pending', // Only group with pending messages
      },
      relations: ['supplier'],
      order: { createdAt: 'DESC' },
    });

    return recentSubmission;
  }

  async getMessageGroups(supplierId?: string, limit: number = 50): Promise<MessageGroup[]> {
    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.supplier', 'supplier')
      .orderBy('submission.createdAt', 'DESC')
      .limit(limit);

    if (supplierId) {
      queryBuilder.where('supplier.id = :supplierId', { supplierId });
    }

    const submissions = await queryBuilder.getMany();
    
    // Group submissions by supplier and time windows
    const groups = new Map<string, MessageGroup>();
    
    for (const submission of submissions) {
      const groupKey = this.generateGroupKey(submission.supplier.id, submission.createdAt);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          supplierId: submission.supplier.id,
          supplierName: submission.supplier.name,
          messages: [],
          groupStartTime: submission.createdAt,
          groupEndTime: submission.createdAt,
          totalMessages: 0,
        });
      }

      const group = groups.get(groupKey)!;
      group.messages.push(submission);
      group.totalMessages++;
      
      // Update group time boundaries
      if (submission.createdAt < group.groupStartTime) {
        group.groupStartTime = submission.createdAt;
      }
      if (submission.createdAt > group.groupEndTime) {
        group.groupEndTime = submission.createdAt;
      }
    }

    // Sort messages within each group by timestamp
    for (const group of groups.values()) {
      group.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return Array.from(groups.values());
  }

  private generateGroupKey(supplierId: string, timestamp: Date): string {
    // Create a group key based on supplier and time window
    const windowStart = Math.floor(timestamp.getTime() / this.groupingWindowMs) * this.groupingWindowMs;
    return `${supplierId}_${windowStart}`;
  }

  async getGroupedSubmissions(supplierId: string, startTime: Date, endTime: Date): Promise<SupplierSubmission[]> {
    return this.submissionRepository.find({
      where: {
        supplier: { id: supplierId },
        createdAt: MoreThan(startTime),
      },
      relations: ['supplier', 'processingLogs'],
      order: { createdAt: 'ASC' },
    });
  }

  async markGroupForProcessing(supplierId: string, groupStartTime: Date): Promise<SupplierSubmission[]> {
    const groupEndTime = new Date(groupStartTime.getTime() + this.groupingWindowMs);
    
    const submissions = await this.submissionRepository.find({
      where: {
        supplier: { id: supplierId },
        createdAt: MoreThan(groupStartTime),
        processingStatus: 'pending',
      },
      relations: ['supplier'],
      order: { createdAt: 'ASC' },
    });

    // Filter submissions within the group window
    const groupedSubmissions = submissions.filter(
      submission => submission.createdAt <= groupEndTime
    );

    // Mark all submissions in the group as processing
    for (const submission of groupedSubmissions) {
      submission.processingStatus = 'processing';
    }

    await this.submissionRepository.save(groupedSubmissions);
    
    return groupedSubmissions;
  }

  async getSubmissionStats(supplierId?: string): Promise<{
    totalSubmissions: number;
    pendingSubmissions: number;
    processingSubmissions: number;
    completedSubmissions: number;
    failedSubmissions: number;
    averageGroupSize: number;
  }> {
    const queryBuilder = this.submissionRepository.createQueryBuilder('submission');
    
    if (supplierId) {
      queryBuilder.where('submission.supplierId = :supplierId', { supplierId });
    }

    const [
      totalSubmissions,
      pendingSubmissions,
      processingSubmissions,
      completedSubmissions,
      failedSubmissions,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('submission.processingStatus = :status', { status: 'pending' }).getCount(),
      queryBuilder.clone().where('submission.processingStatus = :status', { status: 'processing' }).getCount(),
      queryBuilder.clone().where('submission.processingStatus = :status', { status: 'completed' }).getCount(),
      queryBuilder.clone().where('submission.processingStatus = :status', { status: 'failed' }).getCount(),
    ]);

    // Calculate average group size (simplified)
    const groups = await this.getMessageGroups(supplierId, 100);
    const averageGroupSize = groups.length > 0 
      ? groups.reduce((sum, group) => sum + group.totalMessages, 0) / groups.length 
      : 0;

    return {
      totalSubmissions,
      pendingSubmissions,
      processingSubmissions,
      completedSubmissions,
      failedSubmissions,
      averageGroupSize: Math.round(averageGroupSize * 100) / 100,
    };
  }
}