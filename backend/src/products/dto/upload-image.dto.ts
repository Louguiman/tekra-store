import { IsString, IsOptional, IsBoolean, IsNumber, Min, Length } from 'class-validator';

export class UploadImageDto {
  @IsString()
  productId: string;

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