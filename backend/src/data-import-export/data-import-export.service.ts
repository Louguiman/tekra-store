import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product, RefurbishedGrade } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Country } from '../entities/country.entity';
import { ImportProductDto, ImportDataDto } from './dto/import-product.dto';
import { ExportDataDto } from './dto/export-data.dto';
import { DataParsingService } from './services/data-parsing.service';
import { DataExportService } from './services/data-export.service';

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class DataImportExportService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(ProductSpecification)
    private productSpecRepository: Repository<ProductSpecification>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    private dataSource: DataSource,
    private dataParsingService: DataParsingService,
    private dataExportService: DataExportService,
  ) {}

  async importProductData(importData: ImportDataDto): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: []
    };

    // Validate data integrity
    const integrityErrors = this.validateDataIntegrity(importData);
    if (integrityErrors.length > 0) {
      result.success = false;
      result.errors.push(...integrityErrors);
      return result;
    }

    // Process each product in a transaction
    for (const productData of importData.products) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Parse and validate product data
        const product = await this.dataParsingService.parseProductData(productData);
        
        // Validate country codes in prices
        const countryCodes = productData.prices.map(p => p.countryCode);
        await this.dataParsingService.validateCountryCodes(countryCodes);

        // Save product
        const savedProduct = await queryRunner.manager.save(Product, product);

        // Save prices
        for (const priceData of productData.prices) {
          const country = await queryRunner.manager.findOne(Country, {
            where: { code: priceData.countryCode }
          });

          const productPrice = new ProductPrice();
          productPrice.product = savedProduct;
          productPrice.country = country;
          productPrice.price = priceData.price;
          productPrice.promoPrice = priceData.promoPrice;

          await queryRunner.manager.save(ProductPrice, productPrice);
        }

        // Save specifications if provided
        if (productData.specifications) {
          for (const specData of productData.specifications) {
            const specification = new ProductSpecification();
            specification.product = savedProduct;
            specification.name = specData.name;
            specification.value = specData.value;
            specification.sortOrder = specData.sortOrder || 0;

            await queryRunner.manager.save(ProductSpecification, specification);
          }
        }

        // Save images if provided
        if (productData.images) {
          for (const imageData of productData.images) {
            const image = new ProductImage();
            image.product = savedProduct;
            image.url = imageData.url;
            image.altText = imageData.altText;
            image.sortOrder = imageData.sortOrder || 0;
            image.isPrimary = imageData.isPrimary || false;

            await queryRunner.manager.save(ProductImage, image);
          }
        }

        await queryRunner.commitTransaction();
        result.imported++;

      } catch (error) {
        await queryRunner.rollbackTransaction();
        result.failed++;
        result.errors.push(`Product '${productData.name}': ${error.message}`);
      } finally {
        await queryRunner.release();
      }
    }

    if (result.failed > 0) {
      result.success = false;
    }

    return result;
  }

  async importFromFile(fileContent: string, fileType: 'json' | 'csv'): Promise<ImportResult> {
    try {
      let products: ImportProductDto[];

      if (fileType === 'json') {
        products = await this.dataParsingService.parseJSONData(fileContent);
      } else if (fileType === 'csv') {
        products = await this.dataParsingService.parseCSVData(fileContent);
      } else {
        throw new BadRequestException('Unsupported file type');
      }

      const importData: ImportDataDto = { products };
      return await this.importProductData(importData);

    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message]
      };
    }
  }

  async exportData(exportDto: ExportDataDto): Promise<string> {
    return await this.dataExportService.exportData(exportDto);
  }

  async validateImportData(importData: ImportDataDto): Promise<string[]> {
    const allErrors: string[] = [];

    // Validate data integrity
    const integrityErrors = this.validateDataIntegrity(importData);
    allErrors.push(...integrityErrors);

    // Validate each product
    for (let i = 0; i < importData.products.length; i++) {
      const productData = importData.products[i];
      try {
        const productErrors = await this.validateProductData(productData);
        productErrors.forEach(error => {
          allErrors.push(`Product ${i + 1} (${productData.name}): ${error}`);
        });
      } catch (error) {
        allErrors.push(`Product ${i + 1} (${productData.name}): ${error.message}`);
      }
    }

    return allErrors;
  }

  private validateDataIntegrity(data: any): string[] {
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

  private async validateProductData(productData: ImportProductDto): Promise<string[]> {
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

  async getImportTemplate(format: 'json' | 'csv'): Promise<string> {
    const sampleProduct: ImportProductDto = {
      name: 'Sample Gaming Laptop',
      slug: 'sample-gaming-laptop',
      description: 'High-performance gaming laptop with RGB keyboard',
      categoryName: 'Laptops',
      segmentName: 'Premium',
      brand: 'TechBrand',
      isRefurbished: false,
      warrantyMonths: 24,
      prices: [
        {
          countryCode: 'ML',
          price: 850000,
          promoPrice: 800000
        },
        {
          countryCode: 'CI',
          price: 900000
        }
      ],
      specifications: [
        {
          name: 'Processor',
          value: 'Intel Core i7-11800H',
          sortOrder: 1
        },
        {
          name: 'RAM',
          value: '16GB DDR4',
          sortOrder: 2
        }
      ],
      images: [
        {
          url: 'https://example.com/laptop1.jpg',
          altText: 'Gaming laptop front view',
          sortOrder: 1,
          isPrimary: true
        }
      ]
    };

    const templateData: ImportDataDto = {
      products: [sampleProduct]
    };

    if (format === 'json') {
      return JSON.stringify(templateData, null, 2);
    } else {
      // For CSV, we'll create a simplified template
      const csvHeaders = [
        'name', 'slug', 'description', 'categoryName', 'segmentName', 
        'brand', 'isRefurbished', 'refurbishedGrade', 'warrantyMonths', 'prices'
      ];
      
      const csvRow = [
        sampleProduct.name,
        sampleProduct.slug,
        sampleProduct.description,
        sampleProduct.categoryName,
        sampleProduct.segmentName,
        sampleProduct.brand,
        sampleProduct.isRefurbished.toString(),
        '',
        sampleProduct.warrantyMonths.toString(),
        'ML:850000,CI:900000'
      ];

      return [csvHeaders.join(','), csvRow.join(',')].join('\n');
    }
  }
}