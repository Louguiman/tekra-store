import { IsString, IsNumber, IsPositive, IsUUID, IsOptional } from 'class-validator';

export class CreateStockReservationDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  reservationReference?: string;
}

export class StockReservationResponseDto {
  id: string;
  productId: string;
  quantity: number;
  reservationReference?: string;
  expiresAt: Date;
  createdAt: Date;
}