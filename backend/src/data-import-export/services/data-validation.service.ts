import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, RefurbishedGrade } from '../../entities/product.entity';
import { ImportProductDto } from '../dto/import-product.dto';

@Injectable()
export class DataValidationService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async validateProductData(productData: ImportProductDto): Promise<string[]> {
    const errors: string[] = [];

    // Validate name
    if (!productData.name || productData.name.length < 3 || productData.name.length > 255) {
      errors.push('Product name must be between 3 and 255 characters');
    }

    // Validate refurbished grade logic
    if (productData.isRefurbished && !productData.refurbishedGrade) {
      errors.push('Refurbished products must have a grade (A, B, or C)');
    }

    if (!productData.isRefurbished && productData.refurbishedGrade) {
      errors.push('Non-refurbished products should not have a refurbished grade');
    }

    // Validate refurbished grade value
    if (productData.refurbishedGrade && 
        !Object.values(RefurbishedGrade).includes(productData.refurbishedGrade)) {
      errors.push('Refurbished grade must be A, B, or C');
    }

    // Validate warranty months
    if (productData.warrantyMonths !== undefined && productData.warrantyMonths < 0) {
      errors.push('Warranty months must be non-negative');
    }

    // Validate brand length
    if (productData.brand && productData.brand.length > 100) {
      errors.push('Brand name must not exceed 100 characters');
    }

    // Validate required fields
    if (!productData.categoryName) {
      errors.push('Category name is required');
    }

    if (!productData.segmentName) {
      errors.push('Segment name is required');
    }

    if (!productData.prices || productData.prices.length === 0) {
      errors.push('At least one price must be provided');
    }

    // Validate prices
    if (productData.prices) {
      productData.prices.forEach((price, index) => {
        if (!price.countryCode) {
          errors.push(`Price ${index + 1}: Country code is required`);
        }
        if (price.price < 0) {
          errors.push(`Price ${index + 1}: Price must be non-negative`);
        }
        if (price.promoPrice !== undefined && price.promoPrice < 0) {
          errors.push(`Price ${index + 1}: Promo price must be non-negative`);
        }
        if (price.promoPrice !== undefined && price.promoPrice >= price.price) {
          errors.push(`Price ${index + 1}: Promo price must be less than regular price`);
        }
      });
    }

    // Check for duplicate slug
    if (productData.slug) {
      const existingProduct = await this.productRepository.findOne({
        where: { slug: productData.slug }
      });
      if (existingProduct) {
        errors.push(`Product with slug '${productData.slug}' already exists`);
      }
    }

    return errors;
  }

  validateDataIntegrity(data: any): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Data must be a valid object');
      return errors;
    }

    // Check for required structure
    if (Array.isArray(data)) {
      if (data.length === 0) {
        errors.push('Data array cannot be empty');
      }
    } else if (data.products && !Array.isArray(data.products)) {
      errors.push('Products must be an array');
    }

    return errors;
  }

  validateExportSchema(data: any, schemaType: 'products' | 'orders'): string[] {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Export data must be an array');
      return errors;
    }

    if (schemaType === 'products') {
      data.forEach((item, index) => {
        if (!item.id) errors.push(`Product ${index + 1}: ID is required`);
        if (!item.name) errors.push(`Product ${index + 1}: Name is required`);
        if (!item.slug) errors.push(`Product ${index + 1}: Slug is required`);
        if (typeof item.isRefurbished !== 'boolean') {
          errors.push(`Product ${index + 1}: isRefurbished must be boolean`);
        }
        if (!Array.isArray(item.prices)) {
          errors.push(`Product ${index + 1}: Prices must be an array`);
        }
      });
    } else if (schemaType === 'orders') {
      data.forEach((item, index) => {
        if (!item.id) errors.push(`Order ${index + 1}: ID is required`);
        if (!item.orderNumber) errors.push(`Order ${index + 1}: Order number is required`);
        if (!item.status) errors.push(`Order ${index + 1}: Status is required`);
        if (typeof item.totalAmount !== 'number') {
          errors.push(`Order ${index + 1}: Total amount must be a number`);
        }
        if (!Array.isArray(item.items)) {
          errors.push(`Order ${index + 1}: Items must be an array`);
        }
      });
    }

    return errors;
  }
}