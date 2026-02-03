import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePickupPointDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsString()
  countryId: string;
}

export class UpdatePickupPointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PickupPointDto {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  instructions?: string;
  isActive: boolean;
  countryCode: string;
}