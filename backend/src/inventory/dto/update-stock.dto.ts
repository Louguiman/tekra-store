import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class UpdateStockDto {
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  warehouseLocation?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lowStockThreshold?: number;
}