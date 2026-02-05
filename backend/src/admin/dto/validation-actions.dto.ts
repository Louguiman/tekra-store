import { IsOptional, IsString, MaxLength, ValidateNested, Type, IsNotEmpty, IsArray, IsUUID, IsObject } from 'class-validator';
import { ValidationFeedbackDto } from './validation-feedback.dto';
import { ExtractedProductEditDto } from './extracted-product-edit.dto';

export class ApprovalDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractedProductEditDto)
  edits?: ExtractedProductEditDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectionDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidationFeedbackDto)
  feedback: ValidationFeedbackDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BulkApprovalDto {
  @IsArray()
  @IsUUID(4, { each: true })
  validationIds: string[];

  @IsOptional()
  @IsObject()
  globalEdits?: Record<string, ExtractedProductEditDto>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BulkRejectionDto {
  @IsArray()
  @IsUUID(4, { each: true })
  validationIds: string[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidationFeedbackDto)
  feedback: ValidationFeedbackDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}