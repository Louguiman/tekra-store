import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
}

export interface UpdateSupplierDto {
  name?: string;
  isActive?: boolean;
  preferredCategories?: string[];
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
}