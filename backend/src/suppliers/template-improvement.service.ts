import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierTemplate, TemplateField } from '../entities/supplier-template.entity';
import { TemplateSubmission } from '../entities/template-submission.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export interface TemplateImprovement {
  type: 'field_addition' | 'field_removal' | 'validation_adjustment' | 'instruction_clarification' | 'example_update';
  priority: 'low' | 'medium' | 'high';
  description: string;
  reasoning: string;
  suggestedChange: any;
  affectedField?: string;
  supportingData: {
    errorCount: number;
    errorRate: number;
    sampleErrors: string[];
  };
}

export interface TemplateAnalysisResult {
  templateId: string;
  templateName: string;
  analysisDate: Date;
  totalSubmissions: number;
  successRate: number;
  improvements: TemplateImprovement[];
  overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor';
}

@Injectable()
export class TemplateImprovementService {
  constructor(
    @InjectRepository(SupplierTemplate)
    private templateRepository: Repository<SupplierTemplate>,
    @InjectRepository(TemplateSubmission)
    private templateSubmissionRepository: Repository<TemplateSubmission>,
    private auditService: AuditService,
  ) {}

  /**
   * Analyze template usage patterns and suggest improvements
   */
  async analyzeTemplate(templateId: string): Promise<TemplateAnalysisResult> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Get recent submissions (last 100)
    const submissions = await this.templateSubmissionRepository.find({
      where: { template: { id: templateId } },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const improvements: TemplateImprovement[] = [];

    // Analyze common errors
    const errorAnalysis = this.analyzeCommonErrors(template, submissions);
    improvements.push(...errorAnalysis);

    // Analyze field usage
    const fieldAnalysis = this.analyzeFieldUsage(template, submissions);
    improvements.push(...fieldAnalysis);

    // Analyze validation rules
    const validationAnalysis = this.analyzeValidationRules(template, submissions);
    improvements.push(...validationAnalysis);

    // Analyze success rate
    const successfulSubmissions = submissions.filter(s => s.result === 'success').length;
    const successRate = submissions.length > 0 ? successfulSubmissions / submissions.length : 0;

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    if (successRate >= 0.9) {
      overallHealth = 'excellent';
    } else if (successRate >= 0.75) {
      overallHealth = 'good';
    } else if (successRate >= 0.5) {
      overallHealth = 'needs_improvement';
    } else {
      overallHealth = 'poor';
    }

    const result: TemplateAnalysisResult = {
      templateId,
      templateName: template.name,
      analysisDate: new Date(),
      totalSubmissions: submissions.length,
      successRate,
      improvements: improvements.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      overallHealth,
    };

    // Log analysis
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      resource: AuditResource.SUPPLIER,
      resourceId: templateId,
      description: `Template analysis completed: ${template.name}`,
      metadata: {
        totalSubmissions: submissions.length,
        successRate,
        improvementsFound: improvements.length,
        overallHealth,
      },
    });

    return result;
  }

  /**
   * Analyze common errors and suggest improvements
   */
  private analyzeCommonErrors(
    template: SupplierTemplate,
    submissions: TemplateSubmission[],
  ): TemplateImprovement[] {
    const improvements: TemplateImprovement[] = [];

    if (!template.usageStats?.commonErrors) {
      return improvements;
    }

    for (const error of template.usageStats.commonErrors) {
      const errorRate = error.count / template.usageStats.totalUsages;

      // High error rate on a field suggests improvement needed
      if (errorRate > 0.2) {
        const field = template.fields.find(f => f.name === error.field);

        if (error.errorType === 'missing' && field?.required) {
          improvements.push({
            type: 'instruction_clarification',
            priority: 'high',
            description: `Field "${field.label}" is frequently missing`,
            reasoning: `${(errorRate * 100).toFixed(1)}% of submissions are missing this required field`,
            suggestedChange: {
              action: 'add_instruction',
              field: field.name,
              instruction: `Please ensure you always provide the ${field.label}. This is a required field.`,
            },
            affectedField: field.name,
            supportingData: {
              errorCount: error.count,
              errorRate,
              sampleErrors: [`Missing required field: ${field.label}`],
            },
          });
        } else if (error.errorType === 'invalid_format') {
          improvements.push({
            type: 'example_update',
            priority: 'high',
            description: `Field "${field?.label || error.field}" has frequent format errors`,
            reasoning: `${(errorRate * 100).toFixed(1)}% of submissions have invalid format for this field`,
            suggestedChange: {
              action: 'add_format_example',
              field: error.field,
              example: `Add clear format examples in the template instructions`,
            },
            affectedField: error.field,
            supportingData: {
              errorCount: error.count,
              errorRate,
              sampleErrors: [`Invalid format for: ${field?.label || error.field}`],
            },
          });
        } else if (error.errorType === 'out_of_range') {
          improvements.push({
            type: 'validation_adjustment',
            priority: 'medium',
            description: `Validation rules for "${field?.label || error.field}" may be too restrictive`,
            reasoning: `${(errorRate * 100).toFixed(1)}% of submissions fail validation for this field`,
            suggestedChange: {
              action: 'review_validation',
              field: error.field,
              suggestion: 'Consider relaxing validation rules or providing clearer guidance',
            },
            affectedField: error.field,
            supportingData: {
              errorCount: error.count,
              errorRate,
              sampleErrors: [`Out of range: ${field?.label || error.field}`],
            },
          });
        }
      }
    }

    return improvements;
  }

  /**
   * Analyze field usage patterns
   */
  private analyzeFieldUsage(
    template: SupplierTemplate,
    submissions: TemplateSubmission[],
  ): TemplateImprovement[] {
    const improvements: TemplateImprovement[] = [];

    if (submissions.length === 0) {
      return improvements;
    }

    // Analyze which optional fields are rarely used
    for (const field of template.fields) {
      if (!field.required) {
        let providedCount = 0;

        for (const submission of submissions) {
          if (submission.extractedData && submission.extractedData[field.name]) {
            providedCount++;
          }
        }

        const usageRate = providedCount / submissions.length;

        // If an optional field is rarely used, suggest removal
        if (usageRate < 0.1) {
          improvements.push({
            type: 'field_removal',
            priority: 'low',
            description: `Optional field "${field.label}" is rarely used`,
            reasoning: `Only ${(usageRate * 100).toFixed(1)}% of submissions include this field`,
            suggestedChange: {
              action: 'remove_field',
              field: field.name,
              reason: 'Low usage rate suggests this field may not be necessary',
            },
            affectedField: field.name,
            supportingData: {
              errorCount: 0,
              errorRate: 0,
              sampleErrors: [],
            },
          });
        }
      }
    }

    return improvements;
  }

  /**
   * Analyze validation rules effectiveness
   */
  private analyzeValidationRules(
    template: SupplierTemplate,
    submissions: TemplateSubmission[],
  ): TemplateImprovement[] {
    const improvements: TemplateImprovement[] = [];

    // Check if validation rules are too strict or too lenient
    for (const field of template.fields) {
      if (field.validation) {
        let validationFailures = 0;

        for (const submission of submissions) {
          const errors = submission.validationErrors || [];
          const fieldErrors = errors.filter(e => e.field === field.name);
          if (fieldErrors.length > 0) {
            validationFailures++;
          }
        }

        const failureRate = submissions.length > 0 ? validationFailures / submissions.length : 0;

        // High failure rate suggests validation may be too strict
        if (failureRate > 0.3) {
          improvements.push({
            type: 'validation_adjustment',
            priority: 'medium',
            description: `Validation for "${field.label}" fails frequently`,
            reasoning: `${(failureRate * 100).toFixed(1)}% of submissions fail validation for this field`,
            suggestedChange: {
              action: 'adjust_validation',
              field: field.name,
              currentValidation: field.validation,
              suggestion: 'Consider relaxing validation rules or improving field instructions',
            },
            affectedField: field.name,
            supportingData: {
              errorCount: validationFailures,
              errorRate: failureRate,
              sampleErrors: [`Validation failures for: ${field.label}`],
            },
          });
        }
      }
    }

    return improvements;
  }

  /**
   * Apply suggested improvements to a template
   */
  async applyImprovement(
    templateId: string,
    improvement: TemplateImprovement,
  ): Promise<SupplierTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let updated = false;

    switch (improvement.type) {
      case 'instruction_clarification':
        if (improvement.suggestedChange.action === 'add_instruction') {
          const instruction = improvement.suggestedChange.instruction;
          template.instructions = template.instructions
            ? `${template.instructions}\n\n${instruction}`
            : instruction;
          updated = true;
        }
        break;

      case 'field_removal':
        if (improvement.suggestedChange.action === 'remove_field') {
          template.fields = template.fields.filter(
            f => f.name !== improvement.suggestedChange.field
          );
          template.version += 1;
          updated = true;
        }
        break;

      case 'validation_adjustment':
        if (improvement.suggestedChange.action === 'adjust_validation') {
          const field = template.fields.find(f => f.name === improvement.affectedField);
          if (field && field.validation) {
            // This would require specific logic based on the validation type
            // For now, we just log that it needs manual review
            console.log(`Manual review needed for validation adjustment on field: ${field.name}`);
          }
        }
        break;

      case 'example_update':
        if (improvement.suggestedChange.action === 'add_format_example') {
          // Add format example to instructions
          const example = `\n\nFormat example for ${improvement.affectedField}: ${improvement.suggestedChange.example}`;
          template.instructions = template.instructions
            ? `${template.instructions}${example}`
            : example;
          updated = true;
        }
        break;
    }

    if (updated) {
      const savedTemplate = await this.templateRepository.save(template);

      await this.auditService.logAction({
        action: AuditAction.UPDATE,
        resource: AuditResource.SUPPLIER,
        resourceId: templateId,
        description: `Template improvement applied: ${improvement.type}`,
        metadata: {
          improvementType: improvement.type,
          affectedField: improvement.affectedField,
          suggestedChange: improvement.suggestedChange,
        },
      });

      return savedTemplate;
    }

    return template;
  }

  /**
   * Get improvement suggestions for all templates
   */
  async analyzeAllTemplates(): Promise<TemplateAnalysisResult[]> {
    const templates = await this.templateRepository.find({
      where: { isActive: true },
    });

    const results: TemplateAnalysisResult[] = [];

    for (const template of templates) {
      try {
        const analysis = await this.analyzeTemplate(template.id);
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze template ${template.id}:`, error);
      }
    }

    return results;
  }
}
