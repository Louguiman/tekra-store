import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, RefurbishedGrade } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../../entities/product-segment.entity';
import { Country } from '../../entities/country.entity';
import { ImportProductDto } from '../dto/import-product.dto';

@Injectable()
export class DataParsingService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductSegmentEntity)
    private segmentRepository: Repository<ProductSegmentEntity>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
  ) {}

  async parseProductData(rawData: ImportProductDto): Promise<Product> {
    const product = new Product();
    
    // Basic product information
    product.name = rawData.name.trim();
    product.slug = rawData.slug || this.generateSlug(rawData.name);
    product.description = rawData.description?.trim() || null;
    product.brand = rawData.brand?.trim() || null;
    product.isRefurbished = rawData.isRefurbished || false;
    product.warrantyMonths = rawData.warrantyMonths || 0;

    // Handle refurbished grade
    if (rawData.refurbishedGrade) {
      const grade = rawData.refurbishedGrade.toUpperCase();
      if (Object.values(RefurbishedGrade).includes(grade as RefurbishedGrade)) {
        product.refurbishedGrade = grade as RefurbishedGrade;
      }
    }

    // Find and set category
    const category = await this.categoryRepository.findOne({
      where: { name: rawData.categoryName }
    });
    if (!category) {
      throw new BadRequestException(`Category '${rawData.categoryName}' not found`);
    }
    product.category = category;

    // Find and set segment - map string to enum
    let segmentEnum: ProductSegment;
    const segmentName = rawData.segmentName.toLowerCase().replace(/\s+/g, '_');
    
    switch (segmentName) {
      case 'premium':
      case 'gaming':
        segmentEnum = ProductSegment.PREMIUM;
        break;
      case 'mid_range':
      case 'mid-range':
      case 'midrange':
        segmentEnum = ProductSegment.MID_RANGE;
        break;
      case 'refurbished':
        segmentEnum = ProductSegment.REFURBISHED;
        break;
      default:
        throw new BadRequestException(`Invalid segment '${rawData.segmentName}'. Must be Premium, Mid-Range, or Refurbished`);
    }

    const segment = await this.segmentRepository.findOne({
      where: { name: segmentEnum }
    });
    if (!segment) {
      throw new BadRequestException(`Segment '${rawData.segmentName}' not found in database`);
    }
    product.segment = segment;

    return product;
  }

  async parseCSVData(csvContent: string): Promise<ImportProductDto[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must contain at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const products: ImportProductDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new BadRequestException(`Row ${i + 1} has incorrect number of columns`);
      }

      const productData: any = {};
      headers.forEach((header, index) => {
        productData[header] = values[index];
      });

      // Convert string values to appropriate types
      if (productData.isRefurbished) {
        productData.isRefurbished = productData.isRefurbished.toLowerCase() === 'true';
      }
      if (productData.warrantyMonths) {
        productData.warrantyMonths = parseInt(productData.warrantyMonths, 10);
      }

      // Parse prices (assuming format: "ML:50000,CI:55000")
      if (productData.prices) {
        const priceEntries = productData.prices.split(';');
        productData.prices = priceEntries.map((entry: string) => {
          const [countryCode, price] = entry.split(':');
          return {
            countryCode: countryCode.trim(),
            price: parseFloat(price.trim())
          };
        });
      }

      products.push(productData as ImportProductDto);
    }

    return products;
  }

  async parseJSONData(jsonContent: string): Promise<ImportProductDto[]> {
    try {
      const data = JSON.parse(jsonContent);
      
      if (!Array.isArray(data.products)) {
        throw new BadRequestException('JSON must contain a "products" array');
      }

      return data.products;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON format');
      }
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async validateCountryCodes(countryCodes: string[]): Promise<void> {
    const countries = await this.countryRepository.find({
      where: countryCodes.map(code => ({ code }))
    });

    const foundCodes = countries.map(c => c.code);
    const missingCodes = countryCodes.filter(code => !foundCodes.includes(code));

    if (missingCodes.length > 0) {
      throw new BadRequestException(`Invalid country codes: ${missingCodes.join(', ')}`);
    }
  }
}