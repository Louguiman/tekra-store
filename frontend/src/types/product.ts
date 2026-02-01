export enum RefurbishedGrade {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum ProductSegment {
  PREMIUM = 'premium',
  MID_RANGE = 'mid_range',
  REFURBISHED = 'refurbished',
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
}

export interface ProductPrice {
  id: string
  price: number
  promoPrice?: number
  country: {
    id: string
    name: string
    code: string
  }
}

export interface ProductSpecification {
  id: string
  name: string
  value: string
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  sortOrder?: number
  isPrimary: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  brand?: string
  isRefurbished: boolean
  refurbishedGrade?: RefurbishedGrade
  warrantyMonths: number
  createdAt: string
  updatedAt: string
  category?: Category
  segment: ProductSegment
  specifications?: ProductSpecification[]
  images?: ProductImage[]
  prices?: ProductPrice[]
  inventory?: {
    quantity: number
    isInStock: boolean
  }
}