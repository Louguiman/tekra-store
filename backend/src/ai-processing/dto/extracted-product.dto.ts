import { IsString, IsOptional, IsNumber, IsEnum, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtractionMetadataDto {
  @IsEnum(['text', 'image', 'pdf'])
  sourceType: 'text' | 'image' | 'pdf';

  @IsNumber()
  @Min(0)
  processingTime: number;

  @IsString()
  aiModel: string;

  @IsString({ each: true })
  extractedFields: string[];

  @IsOptional()
  fallbackUsed?: boolean;
}

export class ExtractedProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  grade?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ValidateNested()
  @Type(() => ExtractionMetadataDto)
  extractionMetadata: ExtractionMetadataDto;
}

export class ProcessingRequestDto {
  @IsString()
  content: string;

  @IsEnum(['text', 'image', 'pdf'])
  contentType: 'text' | 'image' | 'pdf';

  @IsString()
  supplierId: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class ProcessingResponseDto {
  @ValidateNested({ each: true })
  @Type(() => ExtractedProductDto)
  products: ExtractedProductDto[];

  @IsNumber()
  @Min(0)
  totalProcessingTime: number;

  @IsString()
  status: 'success' | 'partial' | 'failed';

  @IsOptional()
  @IsString()
  error?: string;
}