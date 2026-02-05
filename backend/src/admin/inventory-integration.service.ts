import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { ExtractedProduct } from '../entities/supplier-submission.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

export interface ValidatedProduct extends ExtractedProduct {
  validatedBy: string;
  validatedAt: Date;
  adminEdits?: Record<string, any>;
  approvalNotes?: string;
}

@Injectable()
export class InventoryIntegrationService {
  private readonly logger = new Logger(InventoryIntegrationService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(ProductPrice)
    private readonly priceRepository: Repository<ProductPrice>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductSegmentEntity)
    private readonly segmentRepository: Repository<ProductSegmentEntity>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    private readonly auditService: AuditService,
  ) {}

  async createProductFromValidation(
    validatedProduct: ValidatedProduct,
    supplierId: string,
    submissionId: string,
  ): Promise<Product> {
    try {
      // Create product slug from name
      const slug = this.generateSlug(validatedProduct.name);

      // Find or create category
      let category: Category | null = null;
      if (validatedProduct.category) {
        category = await this.categoryRepository.findOne({
          where: { name: validatedProduct.category },
        });
      }

      // Determine product segment based on condition
      let segment: ProductSegmentEntity | null = null;
      const isRefurbished = validatedProduct.condition === 'refurbished';
      
      if (isRefurbished) {
        segment = await this.segmentRepository.findOne({
          where: { name: ProductSegment.REFURBISHED },
        });
      } else if (validatedProduct.condition === 'new') {
        segment = await this.segmentRepository.findOne({
          where: { name: ProductSegment.PREMIUM },
        });
      } else {
        segment = await this.segmentRepository.findOne({
          where: { name: ProductSegment.MID_RANGE },
        });
      }

      // Create product
      const product = this.productRepository.create({
        name: validatedProduct.name,
        slug,
        description: this.generateDescription(validatedProduct),
        brand: validatedProduct.brand,
        isRefurbished,
        refurbishedGrade: validatedProduct.grade as any,
        category,
        segment,
      });

      const savedProduct = await this.productRepository.save(product);

      // Create inventory item
      if (validatedProduct.quantity) {
        const inventoryItem = this.inventoryRepository.create({
          product: savedProduct,
          quantity: validatedProduct.quantity,
          supplierId,
          warehouseLocation: 'Main Warehouse',
          lowStockThreshold: 5,
        });
        await this.inventoryRepository.save(inventoryItem);
      }

      // Create price (find default country or use first available)
      if (validatedProduct.price) {
        // Try to find a country based on currency, default to first country
        let country: Country | null = null;
        
        if (validatedProduct.currency === 'FCFA') {
          // Find a West African country (e.g., Senegal)
          country = await this.countryRepository.findOne({
            where: { code: 'SN' },
          });
        }
        
        // If no country found, use the first available
        if (!country) {
          country = await this.countryRepository.findOne({});
        }

        if (country) {
          const price = this.priceRepository.create({
            product: savedProduct,
            country,
            price: validatedProduct.price,
          });
          await this.priceRepository.save(price);
        }
      }

      // Log the inventory integration
      await this.auditService.logAction({
        userId: validatedProduct.validatedBy,
        action: AuditAction.INVENTORY_INTEGRATION,
        resource: AuditResource.PRODUCT,
        resourceId: savedProduct.id,
        severity: AuditSeverity.MEDIUM,
        description: `Created product from supplier submission`,
        metadata: {
          submissionId,
          supplierId,
          productName: validatedProduct.name,
          quantity: validatedProduct.quantity,
          price: validatedProduct.price,
        },
        success: true,
      });

      this.logger.log(`Product created from validation: ${savedProduct.id}`);
      return savedProduct;
    } catch (error) {
      this.logger.error(`Failed to create product from validation: ${error.message}`, error.stack);
      
      // Log the failure
      await this.auditService.logAction({
        userId: validatedProduct.validatedBy,
        action: AuditAction.INVENTORY_INTEGRATION,
        resource: AuditResource.PRODUCT,
        resourceId: submissionId,
        severity: AuditSeverity.HIGH,
        description: `Failed to create product from supplier submission`,
        metadata: {
          submissionId,
          supplierId,
          error: error.message,
        },
        success: false,
      });

      throw error;
    }
  }

  async updateProductFromValidation(
    productId: string,
    validatedProduct: ValidatedProduct,
    supplierId: string,
    submissionId: string,
  ): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['category', 'segment'],
      });

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Update product fields
      if (validatedProduct.name) product.name = validatedProduct.name;
      if (validatedProduct.brand) product.brand = validatedProduct.brand;
      if (validatedProduct.condition) {
        product.isRefurbished = validatedProduct.condition === 'refurbished';
      }
      if (validatedProduct.grade) product.refurbishedGrade = validatedProduct.grade as any;

      const savedProduct = await this.productRepository.save(product);

      // Update inventory if quantity provided
      if (validatedProduct.quantity) {
        const inventoryItem = await this.inventoryRepository.findOne({
          where: { product: { id: productId }, supplierId },
        });

        if (inventoryItem) {
          inventoryItem.quantity += validatedProduct.quantity;
          await this.inventoryRepository.save(inventoryItem);
        } else {
          const newInventoryItem = this.inventoryRepository.create({
            product: savedProduct,
            quantity: validatedProduct.quantity,
            supplierId,
            warehouseLocation: 'Main Warehouse',
            lowStockThreshold: 5,
          });
          await this.inventoryRepository.save(newInventoryItem);
        }
      }

      // Log the inventory update
      await this.auditService.logAction({
        userId: validatedProduct.validatedBy,
        action: AuditAction.INVENTORY_INTEGRATION,
        resource: AuditResource.PRODUCT,
        resourceId: savedProduct.id,
        severity: AuditSeverity.MEDIUM,
        description: `Updated product from supplier submission`,
        metadata: {
          submissionId,
          supplierId,
          productId,
          updates: validatedProduct.adminEdits,
        },
        success: true,
      });

      this.logger.log(`Product updated from validation: ${savedProduct.id}`);
      return savedProduct;
    } catch (error) {
      this.logger.error(`Failed to update product from validation: ${error.message}`, error.stack);
      
      // Log the failure
      await this.auditService.logAction({
        userId: validatedProduct.validatedBy,
        action: AuditAction.INVENTORY_INTEGRATION,
        resource: AuditResource.PRODUCT,
        resourceId: productId,
        severity: AuditSeverity.HIGH,
        description: `Failed to update product from supplier submission`,
        metadata: {
          submissionId,
          supplierId,
          productId,
          error: error.message,
        },
        success: false,
      });

      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateDescription(product: ExtractedProduct): string {
    let description = `${product.name}`;
    
    if (product.brand) {
      description += ` by ${product.brand}`;
    }

    if (product.condition) {
      description += `. Condition: ${product.condition}`;
    }

    if (product.grade) {
      description += ` (Grade ${product.grade})`;
    }

    if (product.specifications && Object.keys(product.specifications).length > 0) {
      description += '\n\nSpecifications:\n';
      Object.entries(product.specifications).forEach(([key, value]) => {
        description += `- ${key}: ${value}\n`;
      });
    }

    return description;
  }
}