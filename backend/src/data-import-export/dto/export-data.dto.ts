import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

export enum ExportType {
  PRODUCTS = 'products',
  ORDERS = 'orders',
  ALL = 'all',
}

export class ExportDataDto {
  @IsEnum(ExportType)
  type: ExportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryFilters?: string[];

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export interface ExportedProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  isRefurbished: boolean;
  refurbishedGrade?: string;
  warrantyMonths: number;
  category: {
    name: string;
  };
  segment: {
    name: string;
  };
  prices: Array<{
    countryCode: string;
    price: number;
    promoPrice?: number;
  }>;
  specifications: Array<{
    name: string;
    value: string;
    sortOrder?: number;
  }>;
  images: Array<{
    url: string;
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
  };
  customerEmail?: string;
  customerPhone: string;
  country: {
    code: string;
    name: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
}