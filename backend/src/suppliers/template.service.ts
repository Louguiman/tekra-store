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
      description: `Template deleted: ${template.name}`,
    });
  }

  /**
   * Validate submission data against template
   */
  async validateSubmission(validationDto: TemplateValidationDto): Promise<{
    isValid: boolean;
    errors: FieldValidationError[];
    missingFields: string[];
    validFields: string[];
  }> {
    const template = await this.findOne(validationDto.templateId);
    const errors: FieldValidationError[] = [];
    const missingFields: string[] = [];
    const validFields: string[] = [];

    for (const field of template.fields) {
      const value = validationDto.submissionData[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        missingFields.push(field.name);
        errors.push({
          field: field.name,
          errorType: 'missing',
          message: `Required field "${field.label}" is missing`,
        });
        continue;
      }

      // Skip validation for optional empty fields
      if (!field.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (field.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push({
            field: field.name,
            errorType: 'invalid_format',
            message: `Field "${field.label}" must be a number`,
            expectedFormat: 'number',
            actualValue: String(value),
          });
          continue;
        }

        // Range validation
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.name,
            errorType: 'out_of_range',
            message: `Field "${field.label}" must be at least ${field.validation.min}`,
            actualValue: String(value),
          });
          continue;
        }

        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.name,
            errorType: 'out_of_range',
            message: `Field "${field.label}" must be at most ${field.validation.max}`,
            actualValue: String(value),
          });
          continue;
        }
      }

      // String validation
      if (field.type === 'text' || field.type === 'multiline') {
        const strValue = String(value);

        // Length validation
        if (field.validation?.minLength !== undefined && strValue.length < field.validation.minLength) {
          errors.push({
            field: field.name,
            errorType: 'out_of_range',
            message: `Field "${field.label}" must be at least ${field.validation.minLength} characters`,
            actualValue: strValue,
          });
          continue;
        }

        if (field.validation?.maxLength !== undefined && strValue.length > field.validation.maxLength) {
          errors.push({
            field: field.name,
            errorType: 'out_of_range',
            message: `Field "${field.label}" must be at most ${field.validation.maxLength} characters`,
            actualValue: strValue,
          });
          continue;
        }

        // Pattern validation
        if (field.validation?.pattern) {
          try {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(strValue)) {
              errors.push({
                field: field.name,
                errorType: 'invalid_format',
                message: `Field "${field.label}" does not match the required format`,
                expectedFormat: field.validation.pattern,
                actualValue: strValue,
              });
              continue;
            }
          } catch (error) {
            // Invalid regex pattern in template - log but don't fail validation
            console.error(`Invalid regex pattern in template ${template.id}, field ${field.name}:`, error);
          }
        }
      }

      // Select validation
      if (field.type === 'select') {
        const strValue = String(value);
        if (field.options && !field.options.includes(strValue)) {
          errors.push({
            field: field.name,
            errorType: 'invalid_value',
            message: `Field "${field.label}" must be one of: ${field.options.join(', ')}`,
            actualValue: strValue,
          });
          continue;
        }
      }

      validFields.push(field.name);
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields,
      validFields,
    };
  }

  /**
   * Record template usage and update statistics
   */
  async recordUsage(usageDto: TemplateUsageDto): Promise<void> {
    const template = await this.findOne(usageDto.templateId);
    const supplier = await this.supplierRepository.findOne({
      where: { id: usageDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${usageDto.supplierId} not found`);
    }

    // Create template submission record
    const templateSubmission = this.templateSubmissionRepository.create({
      template,
      supplier,
      submission: usageDto.submissionId ? { id: usageDto.submissionId } as SupplierSubmission : null,
      result: usageDto.result,
      confidenceScore: usageDto.confidenceScore,
      validationErrors: usageDto.validationErrors || [],
      extractedData: usageDto.extractedData || {},
      processingTimeMs: usageDto.processingTimeMs,
      feedback: usageDto.feedback,
    });

    await this.templateSubmissionRepository.save(templateSubmission);

    // Update template usage statistics
    const stats = template.usageStats || {
      totalUsages: 0,
      successfulSubmissions: 0,
      averageConfidenceScore: 0,
      lastUsedDate: new Date(),
      commonErrors: [],
    };

    stats.totalUsages += 1;
    if (usageDto.result === 'success') {
      stats.successfulSubmissions += 1;
    }

    // Update average confidence score
    stats.averageConfidenceScore = 
      (stats.averageConfidenceScore * (stats.totalUsages - 1) + usageDto.confidenceScore) / stats.totalUsages;

    stats.lastUsedDate = new Date();

    // Update common errors
    if (usageDto.validationErrors && usageDto.validationErrors.length > 0) {
      for (const error of usageDto.validationErrors) {
        const existingError = stats.commonErrors.find(
          e => e.field === error.field && e.errorType === error.errorType
        );
        if (existingError) {
          existingError.count += 1;
        } else {
          stats.commonErrors.push({
            field: error.field,
            errorType: error.errorType,
            count: 1,
          });
        }
      }

      // Keep only top 10 most common errors
      stats.commonErrors.sort((a, b) => b.count - a.count);
      stats.commonErrors = stats.commonErrors.slice(0, 10);
    }

    template.usageStats = stats;
    await this.templateRepository.save(template);

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: template.id,
      description: `Template usage recorded: ${template.name}`,
      metadata: {
        supplierId: usageDto.supplierId,
        result: usageDto.result,
        confidenceScore: usageDto.confidenceScore,
        processingTimeMs: usageDto.processingTimeMs,
      },
    });
  }

  /**
   * Get recommended templates for a supplier
   */
  async getRecommendations(recommendationDto: TemplateRecommendationDto): Promise<TemplateRecommendation[]> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: recommendationDto.supplierId },
      relations: ['submissions'],
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${recommendationDto.supplierId} not found`);
    }

    // Get all active templates (global + supplier-specific)
    const templates = await this.findAll({
      isActive: true,
      category: recommendationDto.category,
      type: recommendationDto.contentType,
    });

    const recommendations: TemplateRecommendation[] = [];

    for (const template of templates) {
      let score = 0;
      const reasons: string[] = [];

      // Prefer supplier-specific templates
      if (template.supplier?.id === supplier.id) {
        score += 50;
        reasons.push('Custom template for your account');
      } else if (!template.isGlobal) {
        // Skip templates for other suppliers
        continue;
      }

      // Match category with supplier's preferred categories
      if (supplier.performanceMetrics?.preferredCategories?.includes(template.category)) {
        score += 30;
        reasons.push('Matches your preferred categories');
      }

      // Consider usage statistics
      if (template.usageStats) {
        const successRate = template.usageStats.successfulSubmissions / template.usageStats.totalUsages;
        if (successRate > 0.8) {
          score += 20;
          reasons.push(`High success rate (${(successRate * 100).toFixed(0)}%)`);
        }

        if (template.usageStats.averageConfidenceScore > 80) {
          score += 15;
          reasons.push('High extraction accuracy');
        }

        // Penalize templates with many common errors
        if (template.usageStats.commonErrors.length > 5) {
          score -= 10;
          reasons.push('Some fields may need attention');
        }
      }

      // Match content type
      if (recommendationDto.contentType && template.type === recommendationDto.contentType) {
        score += 25;
        reasons.push('Matches your content type');
      }

      recommendations.push({
        template,
        score,
        reason: reasons.join('; '),
      });
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Get template analytics
   */
  async getAnalytics(templateId: string): Promise<TemplateAnalytics> {
    const template = await this.findOne(templateId);

    // Get recent submissions
    const recentSubmissions = await this.templateSubmissionRepository.find({
      where: { template: { id: templateId } },
      relations: ['supplier', 'submission'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const stats = template.usageStats || {
      totalUsages: 0,
      successfulSubmissions: 0,
      averageConfidenceScore: 0,
      lastUsedDate: new Date(),
      commonErrors: [],
    };

    const successRate = stats.totalUsages > 0 
      ? stats.successfulSubmissions / stats.totalUsages 
      : 0;

    const averageProcessingTime = recentSubmissions.length > 0
      ? recentSubmissions.reduce((sum, sub) => sum + sub.processingTimeMs, 0) / recentSubmissions.length
      : 0;

    // Analyze common issues and provide suggestions
    const commonIssues: Array<{ issue: string; count: number; suggestion: string }> = [];

    for (const error of stats.commonErrors) {
      const field = template.fields.find(f => f.name === error.field);
      let suggestion = '';

      switch (error.errorType) {
        case 'missing':
          suggestion = `Consider making "${field?.label || error.field}" optional or provide clearer instructions`;
          break;
        case 'invalid_format':
          suggestion = `Add format examples for "${field?.label || error.field}" in the template instructions`;
          break;
        case 'out_of_range':
          suggestion = `Review validation rules for "${field?.label || error.field}" - they may be too restrictive`;
          break;
        case 'invalid_value':
          suggestion = `Expand options for "${field?.label || error.field}" or clarify acceptable values`;
          break;
      }

      commonIssues.push({
        issue: `${field?.label || error.field}: ${error.errorType}`,
        count: error.count,
        suggestion,
      });
    }

    return {
      template,
      usageStats: stats,
      recentSubmissions,
      successRate,
      averageProcessingTime,
      commonIssues,
    };
  }

  /**
   * Provide feedback on template usage
   */
  async provideFeedback(templateId: string, supplierId: string, feedback: string): Promise<void> {
    const template = await this.findOne(templateId);
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: templateId,
      description: `Template feedback received: ${template.name}`,
      metadata: {
        supplierId,
        feedback,
        templateName: template.name,
      },
    });
  }

  /**
   * Get templates for a specific supplier (global + supplier-specific)
   */
  async getSupplierTemplates(supplierId: string): Promise<SupplierTemplate[]> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    return this.templateRepository
      .createQueryBuilder('template')
      .where('template.is_active = :isActive', { isActive: true })
      .andWhere(
        '(template.is_global = :isGlobal OR template.supplier_id = :supplierId)',
        { isGlobal: true, supplierId }
      )
      .orderBy('template.supplier_id', 'DESC') // Supplier-specific first
      .addOrderBy('template.created_at', 'DESC')
      .getMany();
  }

  /**
   * Clone a template for customization
   */
  async cloneTemplate(templateId: string, supplierId: string, customizations?: Partial<CreateTemplateDto>): Promise<SupplierTemplate> {
    const sourceTemplate = await this.findOne(templateId);
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    const clonedTemplate = this.templateRepository.create({
      name: customizations?.name || `${sourceTemplate.name} (Custom)`,
      description: customizations?.description || sourceTemplate.description,
      type: customizations?.type || sourceTemplate.type,
      category: customizations?.category || sourceTemplate.category,
      fields: customizations?.fields || sourceTemplate.fields,
      exampleContent: customizations?.exampleContent || sourceTemplate.exampleContent,
      instructions: customizations?.instructions || sourceTemplate.instructions,
      isActive: true,
      isGlobal: false,
      supplier,
      tags: customizations?.tags || sourceTemplate.tags,
      usageStats: {
        totalUsages: 0,
        successfulSubmissions: 0,
        averageConfidenceScore: 0,
        lastUsedDate: new Date(),
        commonErrors: [],
      },
    });

    const savedTemplate = await this.templateRepository.save(clonedTemplate);

    await this.auditService.logAction({
      action: AuditAction.CREATE,
      resource: AuditResource.SUPPLIER,
      resourceId: savedTemplate.id,
      description: `Template cloned: ${savedTemplate.name} from ${sourceTemplate.name}`,
      metadata: {
        sourceTemplateId: templateId,
        supplierId,
        customizations: customizations || {},
      },
    });

    return savedTemplate;
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
