import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierMetrics } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { ProcessingLog } from '../entities/processing-log.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export interface CreateSupplierDto {
  name: string;
  phoneNumber: string;
  countryCode: string;
  preferredCategories?: string[];
  email?: string;
  contactPerson?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  isActive?: boolean;
  preferredCategories?: string[];
  email?: string;
  contactPerson?: string;
}

export interface SupplierActivity {
  submissionId: string;
  contentType: string;
  processingStatus: string;
  validationStatus: string;
  confidenceScore?: number;
  createdAt: Date;
  processingTime?: number;
}

export interface SupplierPerformanceReport {
  supplier: Supplier;
  metrics: SupplierMetrics;
  recentActivity: SupplierActivity[];
  qualityTrend: 'improving' | 'stable' | 'declining';
  tier: 'gold' | 'silver' | 'bronze' | 'new';
}

export interface SupplierPrivileges {
  expeditedProcessing: boolean;
  autoApprovalEnabled: boolean;
  autoApprovalThreshold: number;
  priorityLevel: number; // 1-5, higher is better
  maxDailySubmissions: number;
  requiresManualReview: boolean;
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierSubmission)
    private submissionRepository: Repository<SupplierSubmission>,
    @InjectRepository(ProcessingLog)
    private processingLogRepository: Repository<ProcessingLog>,
    private auditService: AuditService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(createSupplierDto.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Validate country code
    if (!this.isValidCountryCode(createSupplierDto.countryCode)) {
      throw new BadRequestException('Invalid country code');
    }

    // Check if supplier with phone number already exists
    const existingSupplier = await this.supplierRepository.findOne({
      where: { phoneNumber: createSupplierDto.phoneNumber },
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier with this phone number already exists');
    }

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      performanceMetrics: {
        totalSubmissions: 0,
        approvedSubmissions: 0,
        averageConfidenceScore: 0,
        averageProcessingTime: 0,
        lastSubmissionDate: new Date(),
        qualityRating: 3, // Default rating
      },
    });

    const savedSupplier = await this.supplierRepository.save(supplier);

    // Log the supplier registration
    await this.auditService.logAction({
      action: AuditAction.SUPPLIER_REGISTRATION,
      resource: AuditResource.SUPPLIER,
      resourceId: savedSupplier.id,
      description: `Supplier registered: ${savedSupplier.name} (${savedSupplier.phoneNumber})`,
      metadata: {
        supplierName: savedSupplier.name,
        phoneNumber: savedSupplier.phoneNumber,
        countryCode: savedSupplier.countryCode,
        email: savedSupplier.email,
        contactPerson: savedSupplier.contactPerson,
      },
    });

    return savedSupplier;
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      relations: ['submissions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['submissions', 'submissions.processingLogs'],
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { phoneNumber, isActive: true },
    });
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    
    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);

    // Log the supplier update
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: id,
      description: `Supplier updated: ${updatedSupplier.name}`,
      metadata: updateSupplierDto,
    });

    return updatedSupplier;
  }

  async updateMetrics(id: string, metrics: Partial<SupplierMetrics>): Promise<Supplier> {
    const supplier = await this.findOne(id);
    
    supplier.performanceMetrics = {
      ...supplier.performanceMetrics,
      ...metrics,
    };

    return this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    
    await this.supplierRepository.remove(supplier);

    // Log the supplier deletion
    await this.auditService.logAction({
      action: AuditAction.DELETE,
      resource: AuditResource.SUPPLIER,
      resourceId: id,
      description: `Supplier deleted: ${supplier.name}`,
      metadata: {
        supplierName: supplier.name,
        phoneNumber: supplier.phoneNumber,
      },
    });
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getSuppliersByCountry(countryCode: string): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: { countryCode, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get supplier activity history with submission details
   */
  async getSupplierActivity(supplierId: string, limit: number = 50): Promise<SupplierActivity[]> {
    const supplier = await this.findOne(supplierId);
    
    const submissions = await this.submissionRepository.find({
      where: { supplier: { id: supplierId } },
      relations: ['processingLogs'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return submissions.map(submission => {
      const avgConfidence = submission.extractedData?.reduce(
        (sum, product) => sum + product.confidenceScore, 0
      ) / (submission.extractedData?.length || 1);

      const totalProcessingTime = submission.processingLogs?.reduce(
        (sum, log) => sum + log.processingTimeMs, 0
      ) || 0;

      return {
        submissionId: submission.id,
        contentType: submission.contentType,
        processingStatus: submission.processingStatus,
        validationStatus: submission.validationStatus,
        confidenceScore: avgConfidence,
        createdAt: submission.createdAt,
        processingTime: totalProcessingTime,
      };
    });
  }

  /**
   * Get comprehensive performance report for a supplier
   */
  async getPerformanceReport(supplierId: string): Promise<SupplierPerformanceReport> {
    const supplier = await this.findOne(supplierId);
    const recentActivity = await this.getSupplierActivity(supplierId, 20);
    
    // Calculate quality trend based on recent submissions
    const qualityTrend = this.calculateQualityTrend(recentActivity);
    
    // Determine supplier tier based on performance
    const tier = this.calculateSupplierTier(supplier.performanceMetrics);

    return {
      supplier,
      metrics: supplier.performanceMetrics,
      recentActivity,
      qualityTrend,
      tier,
    };
  }

  /**
   * Recalculate and update supplier performance metrics
   */
  async recalculateMetrics(supplierId: string): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);
    
    const submissions = await this.submissionRepository.find({
      where: { supplier: { id: supplierId } },
      relations: ['processingLogs'],
    });

    const totalSubmissions = submissions.length;
    const approvedSubmissions = submissions.filter(
      s => s.validationStatus === 'approved'
    ).length;

    // Calculate average confidence score
    let totalConfidence = 0;
    let confidenceCount = 0;
    submissions.forEach(submission => {
      if (submission.extractedData) {
        submission.extractedData.forEach(product => {
          totalConfidence += product.confidenceScore;
          confidenceCount++;
        });
      }
    });
    const averageConfidenceScore = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Calculate average processing time
    let totalProcessingTime = 0;
    let processingCount = 0;
    submissions.forEach(submission => {
      if (submission.processingLogs) {
        submission.processingLogs.forEach(log => {
          if (log.processingStatus === 'completed') {
            totalProcessingTime += log.processingTimeMs;
            processingCount++;
          }
        });
      }
    });
    const averageProcessingTime = processingCount > 0 ? totalProcessingTime / processingCount : 0;

    // Calculate quality rating (1-5 scale)
    const approvalRate = totalSubmissions > 0 ? approvedSubmissions / totalSubmissions : 0;
    const confidenceRate = averageConfidenceScore / 100;
    const qualityRating = Math.round((approvalRate * 0.6 + confidenceRate * 0.4) * 5);

    const lastSubmission = submissions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    const updatedMetrics: SupplierMetrics = {
      totalSubmissions,
      approvedSubmissions,
      averageConfidenceScore,
      averageProcessingTime,
      lastSubmissionDate: lastSubmission?.createdAt || supplier.performanceMetrics.lastSubmissionDate,
      qualityRating: Math.max(1, Math.min(5, qualityRating)),
    };

    supplier.performanceMetrics = updatedMetrics;
    const updatedSupplier = await this.supplierRepository.save(supplier);

    // Log metrics update
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Supplier metrics recalculated: ${supplier.name}`,
      metadata: { metrics: updatedMetrics },
    });

    return updatedSupplier;
  }

  /**
   * Authenticate supplier by phone number
   */
  async authenticateSupplier(phoneNumber: string): Promise<Supplier | null> {
    const supplier = await this.findByPhoneNumber(phoneNumber);
    
    if (supplier) {
      // Log authentication attempt
      await this.auditService.logAction({
        action: AuditAction.SUPPLIER_AUTHENTICATION,
        resource: AuditResource.SUPPLIER,
        resourceId: supplier.id,
        description: `Supplier authenticated: ${supplier.name}`,
        metadata: { phoneNumber },
      });
    }

    return supplier;
  }

  /**
   * Deactivate supplier account
   */
  async deactivateSupplier(supplierId: string, reason?: string): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);
    
    supplier.isActive = false;
    const updatedSupplier = await this.supplierRepository.save(supplier);

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Supplier deactivated: ${supplier.name}`,
      metadata: { reason },
    });

    return updatedSupplier;
  }

  /**
   * Reactivate supplier account
   */
  async reactivateSupplier(supplierId: string): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);
    
    supplier.isActive = true;
    const updatedSupplier = await this.supplierRepository.save(supplier);

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Supplier reactivated: ${supplier.name}`,
    });

    return updatedSupplier;
  }

  /**
   * Get supplier privileges based on performance tier
   */
  getSupplierPrivileges(supplier: Supplier): SupplierPrivileges {
    const tier = this.calculateSupplierTier(supplier.performanceMetrics);
    const metrics = supplier.performanceMetrics;

    // Base privileges
    const privileges: SupplierPrivileges = {
      expeditedProcessing: false,
      autoApprovalEnabled: false,
      autoApprovalThreshold: 95,
      priorityLevel: 1,
      maxDailySubmissions: 50,
      requiresManualReview: true,
    };

    // Adjust privileges based on tier
    switch (tier) {
      case 'gold':
        privileges.expeditedProcessing = true;
        privileges.autoApprovalEnabled = true;
        privileges.autoApprovalThreshold = 85;
        privileges.priorityLevel = 5;
        privileges.maxDailySubmissions = 200;
        privileges.requiresManualReview = false;
        break;

      case 'silver':
        privileges.expeditedProcessing = true;
        privileges.autoApprovalEnabled = metrics.qualityRating >= 4;
        privileges.autoApprovalThreshold = 90;
        privileges.priorityLevel = 3;
        privileges.maxDailySubmissions = 100;
        privileges.requiresManualReview = false;
        break;

      case 'bronze':
        privileges.expeditedProcessing = false;
        privileges.autoApprovalEnabled = false;
        privileges.autoApprovalThreshold = 95;
        privileges.priorityLevel = 2;
        privileges.maxDailySubmissions = 75;
        privileges.requiresManualReview = true;
        break;

      case 'new':
        privileges.expeditedProcessing = false;
        privileges.autoApprovalEnabled = false;
        privileges.autoApprovalThreshold = 95;
        privileges.priorityLevel = 1;
        privileges.maxDailySubmissions = 50;
        privileges.requiresManualReview = true;
        break;
    }

    return privileges;
  }

  /**
   * Check if supplier qualifies for expedited processing
   */
  async qualifiesForExpeditedProcessing(supplierId: string): Promise<boolean> {
    const supplier = await this.findOne(supplierId);
    const privileges = this.getSupplierPrivileges(supplier);
    return privileges.expeditedProcessing;
  }

  /**
   * Check if supplier qualifies for auto-approval
   */
  async qualifiesForAutoApproval(supplierId: string, confidenceScore: number): Promise<boolean> {
    const supplier = await this.findOne(supplierId);
    const privileges = this.getSupplierPrivileges(supplier);
    
    return privileges.autoApprovalEnabled && confidenceScore >= privileges.autoApprovalThreshold;
  }

  /**
   * Get supplier priority level for queue processing
   */
  async getSupplierPriority(supplierId: string): Promise<number> {
    const supplier = await this.findOne(supplierId);
    const privileges = this.getSupplierPrivileges(supplier);
    return privileges.priorityLevel;
  }

  /**
   * Check if supplier has reached daily submission limit
   */
  async checkDailySubmissionLimit(supplierId: string): Promise<{ allowed: boolean; remaining: number }> {
    const supplier = await this.findOne(supplierId);
    const privileges = this.getSupplierPrivileges(supplier);

    // Get today's submissions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySubmissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.supplier_id = :supplierId', { supplierId })
      .andWhere('submission.created_at >= :today', { today })
      .andWhere('submission.created_at < :tomorrow', { tomorrow })
      .getCount();

    const remaining = Math.max(0, privileges.maxDailySubmissions - todaySubmissions);
    const allowed = remaining > 0;

    return { allowed, remaining };
  }

  /**
   * Upgrade supplier tier manually (admin override)
   */
  async upgradeSupplierTier(supplierId: string, targetTier: 'gold' | 'silver' | 'bronze', reason: string): Promise<Supplier> {
    const supplier = await this.findOne(supplierId);

    // Adjust quality rating to match target tier
    let targetRating = 3;
    switch (targetTier) {
      case 'gold':
        targetRating = 5;
        break;
      case 'silver':
        targetRating = 4;
        break;
      case 'bronze':
        targetRating = 3;
        break;
    }

    supplier.performanceMetrics = {
      ...supplier.performanceMetrics,
      qualityRating: targetRating,
    };

    const updatedSupplier = await this.supplierRepository.save(supplier);

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: supplierId,
      description: `Supplier tier upgraded to ${targetTier}: ${supplier.name}`,
      metadata: { targetTier, reason, previousRating: supplier.performanceMetrics.qualityRating },
    });

    return updatedSupplier;
  }

  /**
   * Get all suppliers by tier
   */
  async getSuppliersByTier(tier: 'gold' | 'silver' | 'bronze' | 'new'): Promise<Supplier[]> {
    const allSuppliers = await this.findAll();
    
    return allSuppliers.filter(supplier => {
      const supplierTier = this.calculateSupplierTier(supplier.performanceMetrics);
      return supplierTier === tier;
    });
  }

  /**
   * Helper: Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation: should start with + and contain 10-15 digits
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Helper: Validate country code format
   */
  private isValidCountryCode(countryCode: string): boolean {
    // ISO 3166-1 alpha-2 country codes
    const validCodes = ['GH', 'NG', 'KE', 'ZA', 'CI', 'SN', 'UG', 'TZ', 'RW', 'ET'];
    return validCodes.includes(countryCode.toUpperCase());
  }

  /**
   * Helper: Calculate quality trend from recent activity
   */
  private calculateQualityTrend(recentActivity: SupplierActivity[]): 'improving' | 'stable' | 'declining' {
    if (recentActivity.length < 5) {
      return 'stable';
    }

    const recentHalf = recentActivity.slice(0, Math.floor(recentActivity.length / 2));
    const olderHalf = recentActivity.slice(Math.floor(recentActivity.length / 2));

    const recentAvg = recentHalf.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / olderHalf.length;

    const difference = recentAvg - olderAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Helper: Calculate supplier tier based on performance metrics
   */
  private calculateSupplierTier(metrics: SupplierMetrics): 'gold' | 'silver' | 'bronze' | 'new' {
    if (metrics.totalSubmissions < 10) {
      return 'new';
    }

    const approvalRate = metrics.approvedSubmissions / metrics.totalSubmissions;
    
    if (metrics.qualityRating >= 4 && approvalRate >= 0.8 && metrics.averageConfidenceScore >= 80) {
      return 'gold';
    }
    
    if (metrics.qualityRating >= 3 && approvalRate >= 0.6 && metrics.averageConfidenceScore >= 60) {
      return 'silver';
    }
    
    return 'bronze';
  }
}