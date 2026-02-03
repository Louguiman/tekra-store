import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { DeliveryType } from '../../entities/delivery-method.entity';

export class CreateDeliveryMethodDto {
  @IsString()
  name: string;

  @IsEnum(DeliveryType)
  type: DeliveryType;

  @IsNumber()
  @Min(0)
  baseFee: number;

  @IsNumber()
  @Min(1)
  estimatedDaysMin: number;

  @IsNumber()
  @Min(1)
  estimatedDaysMax: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  countryId: string;
}

export class UpdateDeliveryMethodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  type?: DeliveryType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDaysMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDaysMax?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DeliveryMethodDto {
  id: string;
  name: string;
  type: DeliveryType;
  baseFee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  description?: string;
  isActive: boolean;
  countryCode: string;
}