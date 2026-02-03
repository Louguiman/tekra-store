import { IsString, IsOptional, Length } from 'class-validator';

export class CountryDto {
  @IsString()
  @Length(2, 2)
  code: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(1, 10)
  currency?: string;

  @IsString()
  @IsOptional()
  flag?: string;
}

export class CountryConfigDto {
  @IsString()
  code: string;

  deliveryMethods: DeliveryMethodDto[];
  paymentProviders: PaymentProviderDto[];
}

export class DeliveryMethodDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  type: 'own_delivery' | 'partner_logistics';

  baseFee: number;
  feePerKm?: number;
  estimatedDays: number;
  description?: string;
}

export class PaymentProviderDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  type: 'mobile_money' | 'card';

  @IsString()
  provider: 'orange' | 'wave' | 'moov' | 'visa' | 'mastercard';

  isActive: boolean;
  processingFee?: number;
}