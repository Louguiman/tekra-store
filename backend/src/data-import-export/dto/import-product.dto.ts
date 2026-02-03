import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { RefurbishedGrade } from '../../entities/product.entity';

export class ImportProductSpecificationDto {
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

export class ImportProductImageDto {
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

export class ImportProductPriceDto {
  @IsString()
  countryCode: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promoPrice?: number;
}

export class ImportProductDto {
  @IsString()
  @Length(3, 255)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryName: string;

  @IsString()
  segmentName: string;

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
  @Type(() => ImportProductSpecificationDto)
  specifications?: ImportProductSpecificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductImageDto)
  images?: ImportProductImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductPriceDto)
  prices: ImportProductPriceDto[];
}

export class ImportDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductDto)
  products: ImportProductDto[];
}