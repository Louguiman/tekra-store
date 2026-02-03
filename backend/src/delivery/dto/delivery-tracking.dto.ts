import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DeliveryStatus } from '../../entities/delivery-tracking.entity';

export class CreateDeliveryTrackingDto {
  @IsString()
  orderId: string;

  @IsString()
  trackingNumber: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}

export class UpdateDeliveryTrackingDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  carrierName?: string;
}

export class DeliveryTrackingDto {
  id: string;
  trackingNumber: string;
  status: DeliveryStatus;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryNotes?: string;
  carrierName?: string;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
}