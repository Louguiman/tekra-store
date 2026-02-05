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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/dto/notification.dto';

export interface ValidatedProduct extends ExtractedProduct {
  validatedBy: string;
  validatedAt: Date;
  adminEdits?: Record<string, any>;
  approvalNotes?: string;
}

export interface InventoryChangeNotification {
  productId: string;
  productName: string;
  changeType: 'created' | 'updated' | 'stock_added';
  quantity?: number;
  supplierId: string;
  adminId: string;
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
    private readonly notificationsService: NotificationsService,
  ) {}

  async createProductFromValidation(
    validatedProduct: ValidatedProduct,
    supplierId: string,
    submissionId: string,
  ): Promise<Product> {
    try {
      // Create product slug from name
      const slug = await this.generateUniqueSlug(validatedProduct.name);

      // Find or create category
      const category = await this.findOrCreateCategory(validatedProduct.category);

      // Determine product segment based on condition
      const segment = await this.determineProductSegment(validatedProduct.condition);

      // Determine refurbished grade
      const refurbishedGrade = this.determineRefurbishedGrade(validatedProduct);

      // Create product
      const product = this.productRepository.create({
        name: validatedProduct.name,
        slug,
        description: this.generateDescription(validatedProduct),
        brand: validatedProduct.brand,
        isRefurbished: validatedProduct.condition === 'refurbished',
        refurbishedGrade,
        category,
        segment,
      });

      const savedProduct = await this.productRepository.save(product);

      // Create inventory item with supplier tracking
      if (validatedProduct.quantity && validatedProduct.quantity > 0) {
        await this.createInventoryItem(savedProduct, validatedProduct.quantity, supplierId);
      }

      // Create prices across countries
      if (validatedProduct.price && validatedProduct.price > 0) {
        await this.createProductPrices(savedProduct, validatedProduct.price, validatedProduct.currency);
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
          category: category?.name,
          segment: segment?.name,
        },
        success: true,
      });

      // Send notifications to stakeholders
      await this.notifyInventoryChange({
        productId: savedProduct.id,
        productName: savedProduct.name,
        changeType: 'created',
        quantity: validatedProduct.quantity,
        supplierId,
        adminId: validatedProduct.validatedBy,
      });

      // Send dashboard update
      await this.sendDashboardUpdate({
        productId: savedProduct.id,
        productName: savedProduct.name,
        changeType: 'created',
        quantity: validatedProduct.quantity,
        supplierId,
        adminId: validatedProduct.validatedBy,
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

      // Track changes for audit
      const changes: Record<string, any> = {};

      // Update product fields
      if (validatedProduct.name && validatedProduct.name !== product.name) {
        changes.name = { old: product.name, new: validatedProduct.name };
        product.name = validatedProduct.name;
        product.slug = await this.generateUniqueSlug(validatedProduct.name, productId);
      }

      if (validatedProduct.brand && validatedProduct.brand !== product.brand) {
        changes.brand = { old: product.brand, new: validatedProduct.brand };
        product.brand = validatedProduct.brand;
      }

      if (validatedProduct.condition) {
        const isRefurbished = validatedProduct.condition === 'refurbished';
        if (isRefurbished !== product.isRefurbished) {
          changes.isRefurbished = { old: product.isRefurbished, new: isRefurbished };
          product.isRefurbished = isRefurbished;
        }
      }

      if (validatedProduct.grade) {
        const newGrade = this.determineRefurbishedGrade(validatedProduct);
        if (newGrade !== product.refurbishedGrade) {
          changes.refurbishedGrade = { old: product.refurbishedGrade, new: newGrade };
          product.refurbishedGrade = newGrade;
        }
      }

      // Update category if provided
      if (validatedProduct.category) {
        const category = await this.findOrCreateCategory(validatedProduct.category);
        if (category && category.id !== product.category?.id) {
          changes.category = { old: product.category?.name, new: category.name };
          product.category = category;
        }
      }

      // Update segment if condition changed
      if (validatedProduct.condition) {
        const segment = await this.determineProductSegment(validatedProduct.condition);
        if (segment && segment.id !== product.segment?.id) {
          changes.segment = { old: product.segment?.name, new: segment.name };
          product.segment = segment;
        }
      }

      // Update description
      product.description = this.generateDescription(validatedProduct);

      const savedProduct = await this.productRepository.save(product);

      // Update inventory if quantity provided
      if (validatedProduct.quantity && validatedProduct.quantity > 0) {
        await this.updateInventoryItem(savedProduct, validatedProduct.quantity, supplierId);
      }

      // Update prices if provided
      if (validatedProduct.price && validatedProduct.price > 0) {
        await this.updateProductPrices(savedProduct, validatedProduct.price, validatedProduct.currency);
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
          changes,
          adminEdits: validatedProduct.adminEdits,
        },
        success: true,
      });

      // Send notifications to stakeholders
      const changeType = validatedProduct.quantity ? 'stock_added' : 'updated';
      await this.notifyInventoryChange({
        productId: savedProduct.id,
        productName: savedProduct.name,
        changeType,
        quantity: validatedProduct.quantity,
        supplierId,
        adminId: validatedProduct.validatedBy,
      });

      // Send dashboard update
      await this.sendDashboardUpdate({
        productId: savedProduct.id,
        productName: savedProduct.name,
        changeType,
        quantity: validatedProduct.quantity,
        supplierId,
        adminId: validatedProduct.validatedBy,
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

  private async generateUniqueSlug(name: string, excludeProductId?: string): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingProduct = await this.productRepository.findOne({
        where: { slug },
      });

      if (!existingProduct || existingProduct.id === excludeProductId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async findOrCreateCategory(categoryName?: string): Promise<Category | null> {
    if (!categoryName) {
      return null;
    }

    let category = await this.categoryRepository.findOne({
      where: { name: categoryName },
    });

    if (!category) {
      // Create new category
      const slug = this.generateSlug(categoryName);
      category = this.categoryRepository.create({
        name: categoryName,
        slug,
        description: `Auto-generated category for ${categoryName}`,
      });
      category = await this.categoryRepository.save(category);
      this.logger.log(`Created new category: ${categoryName}`);
    }

    return category;
  }

  private async determineProductSegment(condition?: string): Promise<ProductSegmentEntity | null> {
    if (!condition) {
      return null;
    }

    let segmentName: ProductSegment;

    if (condition === 'refurbished') {
      segmentName = ProductSegment.REFURBISHED;
    } else if (condition === 'new') {
      segmentName = ProductSegment.PREMIUM;
    } else {
      segmentName = ProductSegment.MID_RANGE;
    }

    const segment = await this.segmentRepository.findOne({
      where: { name: segmentName },
    });

    return segment;
  }

  private determineRefurbishedGrade(product: ExtractedProduct): any {
    if (product.condition !== 'refurbished') {
      return null;
    }

    // If grade is explicitly provided, use it
    if (product.grade) {
      const gradeUpper = product.grade.toUpperCase();
      if (['A', 'B', 'C'].includes(gradeUpper)) {
        return gradeUpper;
      }
    }

    // Default to grade B for refurbished products without explicit grade
    return 'B';
  }

  private async createInventoryItem(
    product: Product,
    quantity: number,
    supplierId: string,
  ): Promise<InventoryItem> {
    const inventoryItem = this.inventoryRepository.create({
      product,
      quantity,
      supplierId,
      warehouseLocation: 'Main Warehouse',
      lowStockThreshold: Math.max(5, Math.floor(quantity * 0.1)), // 10% of initial quantity or 5, whichever is higher
    });

    const savedItem = await this.inventoryRepository.save(inventoryItem);
    this.logger.log(`Created inventory item for product ${product.id}: ${quantity} units`);
    return savedItem;
  }

  private async updateInventoryItem(
    product: Product,
    quantity: number,
    supplierId: string,
  ): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { product: { id: product.id }, supplierId },
    });

    if (inventoryItem) {
      // Add to existing inventory
      inventoryItem.quantity += quantity;
      const savedItem = await this.inventoryRepository.save(inventoryItem);
      this.logger.log(`Updated inventory for product ${product.id}: added ${quantity} units (total: ${savedItem.quantity})`);
      return savedItem;
    } else {
      // Create new inventory item for this supplier
      return this.createInventoryItem(product, quantity, supplierId);
    }
  }

  private async createProductPrices(
    product: Product,
    price: number,
    currency?: string,
  ): Promise<ProductPrice[]> {
    const prices: ProductPrice[] = [];

    // Determine which countries to create prices for based on currency
    let countries: Country[] = [];

    if (currency === 'FCFA' || currency === 'XOF') {
      // Find all West African countries using FCFA
      countries = await this.countryRepository.find({
        where: [
          { code: 'SN' }, // Senegal
          { code: 'ML' }, // Mali
          { code: 'CI' }, // Côte d'Ivoire
          { code: 'BF' }, // Burkina Faso
        ],
      });
    }

    // If no countries found or currency not specified, use first available country
    if (countries.length === 0) {
      const defaultCountry = await this.countryRepository.findOne({});
      if (defaultCountry) {
        countries = [defaultCountry];
      }
    }

    // Create price for each country
    for (const country of countries) {
      const productPrice = this.priceRepository.create({
        product,
        country,
        price,
      });
      const savedPrice = await this.priceRepository.save(productPrice);
      prices.push(savedPrice);
      this.logger.log(`Created price for product ${product.id} in ${country.code}: ${price}`);
    }

    return prices;
  }

  private async updateProductPrices(
    product: Product,
    price: number,
    currency?: string,
  ): Promise<ProductPrice[]> {
    // Get existing prices for this product
    const existingPrices = await this.priceRepository.find({
      where: { product: { id: product.id } },
      relations: ['country'],
    });

    const updatedPrices: ProductPrice[] = [];

    if (existingPrices.length > 0) {
      // Update existing prices
      for (const existingPrice of existingPrices) {
        existingPrice.price = price;
        const savedPrice = await this.priceRepository.save(existingPrice);
        updatedPrices.push(savedPrice);
        this.logger.log(`Updated price for product ${product.id} in ${existingPrice.country.code}: ${price}`);
      }
    } else {
      // No existing prices, create new ones
      return this.createProductPrices(product, price, currency);
    }

    return updatedPrices;
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

  /**
   * Send notifications to stakeholders about inventory changes
   */
  async notifyInventoryChange(notification: InventoryChangeNotification): Promise<void> {
    try {
      const message = this.buildInventoryChangeMessage(notification);
      
      // Send email notification to admin users
      // In a real implementation, this would fetch admin emails from the database
      const adminEmails = await this.getAdminEmails();
      
      for (const email of adminEmails) {
        await this.notificationsService.sendNotification({
          type: 'support_message' as any, // Using support_message as a generic notification type
          channel: NotificationChannel.EMAIL,
          recipient: email,
          subject: `Inventory Update: ${notification.productName}`,
          message,
          templateData: {
            productName: notification.productName,
            changeType: notification.changeType,
            quantity: notification.quantity,
          },
        });
      }

      this.logger.log(`Inventory change notifications sent for product ${notification.productId}`);
    } catch (error) {
      this.logger.error(`Failed to send inventory change notifications: ${error.message}`, error.stack);
      // Don't throw - notification failures shouldn't block inventory updates
    }
  }

  /**
   * Build a human-readable message for inventory changes
   */
  private buildInventoryChangeMessage(notification: InventoryChangeNotification): string {
    let message = `<h2>Inventory Update</h2>`;
    message += `<p><strong>Product:</strong> ${notification.productName}</p>`;
    
    switch (notification.changeType) {
      case 'created':
        message += `<p>A new product has been added to the inventory.</p>`;
        if (notification.quantity) {
          message += `<p><strong>Initial Stock:</strong> ${notification.quantity} units</p>`;
        }
        break;
      case 'updated':
        message += `<p>Product information has been updated.</p>`;
        break;
      case 'stock_added':
        message += `<p>Stock has been replenished.</p>`;
        if (notification.quantity) {
          message += `<p><strong>Added:</strong> ${notification.quantity} units</p>`;
        }
        break;
    }

    message += `<p><strong>Supplier ID:</strong> ${notification.supplierId}</p>`;
    message += `<p><strong>Updated by:</strong> ${notification.adminId}</p>`;
    message += `<p><em>This is an automated notification from the inventory management system.</em></p>`;

    return message;
  }

  /**
   * Get admin email addresses for notifications
   * In a real implementation, this would query the User table for admin users
   */
  private async getAdminEmails(): Promise<string[]> {
    // Mock implementation - in production, query User table for admin emails
    // const admins = await this.userRepository.find({
    //   where: { role: { name: 'admin' } },
    //   select: ['email'],
    // });
    // return admins.map(admin => admin.email);
    
    // For now, return empty array or configured admin emails
    const configuredEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
    if (configuredEmails) {
      return configuredEmails.split(',').map(email => email.trim());
    }
    
    return [];
  }

  /**
   * Send real-time dashboard update notification
   * This would integrate with WebSocket or Server-Sent Events in production
   */
  async sendDashboardUpdate(notification: InventoryChangeNotification): Promise<void> {
    try {
      // In production, this would emit a WebSocket event or SSE message
      // For now, just log the update
      this.logger.log(`Dashboard update: ${JSON.stringify(notification)}`);
      
      // Future implementation:
      // this.websocketGateway.emit('inventory-update', notification);
    } catch (error) {
      this.logger.error(`Failed to send dashboard update: ${error.message}`, error.stack);
    }
  }
}