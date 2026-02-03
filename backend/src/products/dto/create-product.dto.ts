import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { RefurbishedGrade } from '../../entities/product.entity';

export class CreateProductSpecificationDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 500)
  value: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductImageDto {
  @IsString()
  @Length(1, 500)
  url: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  altText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateProductPriceDto {
  @IsString()
  countryId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promoPrice?: number;
}

export class CreateProductDto {
  @IsString()
  @Length(3, 255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId: string;

  @IsString()
  segmentId: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  brand?: string;

  @IsOptional()
  @IsBoolean()
  isRefurbished?: boolean;

  @IsOptional()
  @IsEnum(RefurbishedGrade)
  refurbishedGrade?: RefurbishedGrade;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  warrantyMonths?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSpecificationDto)
  specifications?: CreateProductSpecificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductPriceDto)
  prices: CreateProductPriceDto[];
}