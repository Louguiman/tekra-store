import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { SupplierTemplate, TemplateType, TemplateCategory, TemplateUsageStats } from '../entities/supplier-template.entity';
import { TemplateSubmission, SubmissionResult, FieldValidationError } from '../entities/template-submission.entity';
import { Supplier } from '../entities/supplier.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
  TemplateUsageDto,
  TemplateValidationDto,
  TemplateRecommendationDto,
} from './dto/template.dto';

export interface TemplateRecommendation {
  template: SupplierTemplate;
  score: number;
  reason: string;
}

export interface TemplateAnalytics {
  template: SupplierTemplate;
  usageStats: TemplateUsageStats;
  recentSubmissions: TemplateSubmission[];
  successRate: number;
  averageProcessingTime: number;
  commonIssues: Array<{ issue: string; count: number; suggestion: string }>;
}

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(SupplierTemplate)
    private templateRepository: Repository<SupplierTemplate>,
    @InjectRepository(TemplateSubmission)
    private templateSubmissionRepository: Repository<TemplateSubmission>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierSubmission)
    private supplierSubmissionRepository: Repository<SupplierSubmission>,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new template
   */
  async create(createTemplateDto: CreateTemplateDto): Promise<SupplierTemplate> {
    // Validate supplier if provided
    if (createTemplateDto.supplierId) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: createTemplateDto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${createTemplateDto.supplierId} not found`);
      }
    }

    // Validate fields
    this.validateTemplateFields(createTemplateDto.fields);

    const template = this.templateRepository.create({
      ...createTemplateDto,
      supplier: createTemplateDto.supplierId ? { id: createTemplateDto.supplierId } as Supplier : null,
      usageStats: {
        totalUsages: 0,
        successfulSubmissions: 0,
        averageConfidenceScore: 0,
        lastUsedDate: new Date(),
        commonErrors: [],
      },
    });

    const savedTemplate = await this.templateRepository.save(template);

    await this.auditService.logAction({
      action: AuditAction.CREATE,
      resource: AuditResource.SUPPLIER,
      resourceId: savedTemplate.id,
      description: `Template created: ${savedTemplate.name}`,
      metadata: {
        templateName: savedTemplate.name,
        type: savedTemplate.type,
        category: savedTemplate.category,
        isGlobal: savedTemplate.isGlobal,
        supplierId: createTemplateDto.supplierId,
      },
    });

    return savedTemplate;
  }

  /**
   * Find all templates with optional filters
   */
  async findAll(filters?: TemplateFiltersDto): Promise<SupplierTemplate[]> {
    const where: FindOptionsWhere<SupplierTemplate> = {};

    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.category) where.category = filters.category;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.isGlobal !== undefined) where.isGlobal = filters.isGlobal;
      if (filters.supplierId) where.supplier = { id: filters.supplierId };
    }

    let query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.supplier', 'supplier');

    // Apply where conditions
    if (filters?.type) {
      query = query.andWhere('template.type = :type', { type: filters.type });
    }
    if (filters?.category) {
      query = query.andWhere('template.category = :category', { category: filters.category });
    }
    if (filters?.isActive !== undefined) {
      query = query.andWhere('template.is_active = :isActive', { isActive: filters.isActive });
    }
    if (filters?.isGlobal !== undefined) {
      query = query.andWhere('template.is_global = :isGlobal', { isGlobal: filters.isGlobal });
    }
    if (filters?.supplierId) {
      query = query.andWhere('template.supplier_id = :supplierId', { supplierId: filters.supplierId });
    }
    if (filters?.search) {
      query = query.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.andWhere('template.tags && :tags', { tags: filters.tags });
    }

    return query.orderBy('template.created_at', 'DESC').getMany();
  }

  /**
   * Find one template by ID
   */
  async findOne(id: string): Promise<SupplierTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<SupplierTemplate> {
    const template = await this.findOne(id);

    // Validate fields if provided
    if (updateTemplateDto.fields) {
      this.validateTemplateFields(updateTemplateDto.fields);
    }

    // Increment version if fields are changed
    if (updateTemplateDto.fields) {
      template.version += 1;
    }

    Object.assign(template, updateTemplateDto);
    const updatedTemplate = await this.templateRepository.save(template);

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: id,
      description: `Template updated: ${updatedTemplate.name}`,
      metadata: {
        updates: updateTemplateDto,
        newVersion: updatedTemplate.version,
      },
    });

    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    
    await this.templateRepository.remove(template);

    await this.auditService.logAction({
      action: AuditAction.DELETE,
      resource: AuditResource.SUPPLIER,
      resourceId: id,
      description: `Tem
plate deleted: ${template.name}`,
    });
  }

  /**
   * Validate template fields structure
   * @private
   */
  private validateTemplateFields(fields: any[]): void {
    if (!Array.isArray(fields)) {
      throw new BadRequestException('Template fields must be an array');
    }

    if (fields.length === 0) {
      throw new BadRequestException('Template must have at least one field');
    }

    const fieldNames = new Set<string>();

    for (const field of fields) {
      // Check required properties
      if (!field.name || typeof field.name !== 'string') {
        throw new BadRequestException('Each field must have a valid name');
      }

      if (!field.label || typeof field.label !== 'string') {
        throw new BadRequestException(`Field "${field.name}" must have a valid label`);
      }

      if (!field.type || !['text', 'number', 'select', 'multiline'].includes(field.type)) {
        throw new BadRequestException(
          `Field "${field.name}" must have a valid type (text, number, select, or multiline)`
        );
      }

      if (typeof field.required !== 'boolean') {
        throw new BadRequestException(`Field "${field.name}" must have a boolean required property`);
      }

      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        throw new BadRequestException(`Duplicate field name: ${field.name}`);
      }
      fieldNames.add(field.name);

      // Validate select field has options
      if (field.type === 'select') {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          throw new BadRequestException(`Select field "${field.name}" must have at least one option`);
        }
      }

      // Validate validation rules if present
      if (field.validation) {
        if (field.validation.pattern && typeof field.validation.pattern !== 'string') {
          throw new BadRequestException(`Field "${field.name}" validation pattern must be a string`);
        }

        if (field.validation.min !== undefined && typeof field.validation.min !== 'number') {
          throw new BadRequestException(`Field "${field.name}" validation min must be a number`);
        }

        if (field.validation.max !== undefined && typeof field.validation.max !== 'number') {
          throw new BadRequestException(`Field "${field.name}" validation max must be a number`);
        }

        if (field.validation.minLength !== undefined && typeof field.validation.minLength !== 'number') {
          throw new BadRequestException(`Field "${field.name}" validation minLength must be a number`);
        }

        if (field.validation.maxLength !== undefined && typeof field.validation.maxLength !== 'number') {
          throw new BadRequestException(`Field "${field.name}" validation maxLength must be a number`);
        }

        // Validate min/max relationships
        if (field.validation.min !== undefined && field.validation.max !== undefined) {
          if (field.validation.min > field.validation.max) {
            throw new BadRequestException(`Field "${field.name}" validation min cannot be greater than max`);
          }
        }

        if (field.validation.minLength !== undefined && field.validation.maxLength !== undefined) {
          if (field.validation.minLength > field.validation.maxLength) {
            throw new BadRequestException(
              `Field "${field.name}" validation minLength cannot be greater than maxLength`
            );
          }
        }
      }
    }
  }
}
