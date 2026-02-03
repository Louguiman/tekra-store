import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateDeliveryFeeDto {
  @IsString()
  countryCode: string;

  @IsString()
  deliveryMethodId: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class DeliveryFeeResultDto {
  deliveryFee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  deliveryMethodName: string;
  freeDeliveryThreshold?: number;
}