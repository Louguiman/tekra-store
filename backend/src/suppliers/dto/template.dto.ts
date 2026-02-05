import {
  IsString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateType, TemplateCategory, TemplateField } from '../../entities/supplier-template.entity';

export class TemplateFieldDto implements TemplateField {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsEnum(['text', 'number', 'select', 'multiline'])
  type: 'text' | 'number' | 'select' | 'multiline';

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholder?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsObject()
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsEnum(TemplateType)
  type: TemplateType;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields: TemplateFieldDto[];

  @IsString()
  exampleContent: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  type?: TemplateType;

  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];

  @IsOptional()
  @IsString()
  exampleContent?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TemplateFiltersDto {
  @IsOptional()
  @IsEnum(TemplateType)
  type?: TemplateType;

  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isGlobal?: boolean;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TemplateValidationDto {
  @IsUUID()
  templateId: string;

  @IsObject()
  submissionData: Record<string, any>;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class TemplateUsageDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  supplierId: string;

  @IsUUID()
  @IsOptional()
  submissionId?: string;

  @IsEnum(['success', 'partial_success', 'failed'])
  result: 'success' | 'partial_success' | 'failed';

  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore: number;

  @IsOptional()
  @IsArray()
  validationErrors?: Array<{
    field: string;
    errorType: string;
    message: string;
  }>;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, any>;

  @IsNumber()
  @Min(0)
  processingTimeMs: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class TemplateRecommendationDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsEnum(TemplateType)
  contentType?: TemplateType;
}
