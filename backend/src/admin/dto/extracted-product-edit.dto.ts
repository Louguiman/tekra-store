import { IsOptional, IsString, IsIn, IsNumber, IsInt, IsObject, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtractedProductEditDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsIn(['new', 'used', 'refurbished'])
  condition?: string;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  grade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;
}