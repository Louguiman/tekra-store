import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Order } from '../../entities/order.entity';
import { ExportDataDto, ExportFormat, ExportType, ExportedProduct, ExportedOrder } from '../dto/export-data.dto';

@Injectable()
export class DataExportService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async exportData(exportDto: ExportDataDto): Promise<string> {
    let data: any[];

    switch (exportDto.type) {
      case ExportType.PRODUCTS:
        data = await this.exportProducts(exportDto);
        break;
      case ExportType.ORDERS:
        data = await this.exportOrders(exportDto);
        break;
      case ExportType.ALL:
        const products = await this.exportProducts(exportDto);
        const orders = await this.exportOrders(exportDto);
        data = { products, orders } as any;
        break;
      default:
        throw new Error('Invalid export type');
    }

    return this.formatData(data, exportDto.format);
  }

  private async exportProducts(exportDto: ExportDataDto): Promise<ExportedProduct[]> {
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.segment', 'segment')
      .leftJoinAndSelect('product.prices', 'prices')
      .leftJoinAndSelect('prices.country', 'priceCountry')
      .leftJoinAndSelect('product.specifications', 'specifications')
      .leftJoinAndSelect('product.images', 'images');

    // Apply country filters if specified
    if (exportDto.countryFilters && exportDto.countryFilters.length > 0) {
      queryBuilder.andWhere('priceCountry.code IN (:...countryCodes)', {
        countryCodes: exportDto.countryFilters
      });
    }

    // Apply date filters
    if (exportDto.dateFrom) {
      queryBuilder.andWhere('product.createdAt >= :dateFrom', {
        dateFrom: new Date(exportDto.dateFrom)
      });
    }

    if (exportDto.dateTo) {
      queryBuilder.andWhere('product.createdAt <= :dateTo', {
        dateTo: new Date(exportDto.dateTo)
      });
    }

    const products = await queryBuilder.getMany();

    return products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      isRefurbished: product.isRefurbished,
      refurbishedGrade: product.refurbishedGrade,
      warrantyMonths: product.warrantyMonths,
      category: {
        name: product.category?.name || ''
      },
      segment: {
        name: product.segment?.name || ''
      },
      prices: product.prices?.map(price => ({
        countryCode: price.country?.code || '',
        price: Number(price.price),
        promoPrice: price.promoPrice ? Number(price.promoPrice) : undefined
      })) || [],
      specifications: product.specifications?.map(spec => ({
        name: spec.name,
        value: spec.value,
        sortOrder: spec.sortOrder
      })) || [],
      images: product.images?.map(image => ({
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary
      })) || [],
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    }));
  }

  private async exportOrders(exportDto: ExportDataDto): Promise<ExportedOrder[]> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.country', 'country')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    // Apply country filters if specified
    if (exportDto.countryFilters && exportDto.countryFilters.length > 0) {
      queryBuilder.andWhere('country.code IN (:...countryCodes)', {
        countryCodes: exportDto.countryFilters
      });
    }

    // Apply date filters
    if (exportDto.dateFrom) {
      queryBuilder.andWhere('order.createdAt >= :dateFrom', {
        dateFrom: new Date(exportDto.dateFrom)
      });
    }

    if (exportDto.dateTo) {
      queryBuilder.andWhere('order.createdAt <= :dateTo', {
        dateTo: new Date(exportDto.dateTo)
      });
    }

    const orders = await queryBuilder.getMany();

    return orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      deliveryFee: Number(order.deliveryFee),
      deliveryAddress: order.deliveryAddress,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      country: {
        code: order.country?.code || '',
        name: order.country?.name || ''
      },
      items: order.items?.map(item => ({
        productName: item.product?.name || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })) || [],
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    }));
  }

  private formatData(data: any, format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, 2);
      case ExportFormat.CSV:
        return this.convertToCSV(data);
      default:
        throw new Error('Invalid export format');
    }
  }

  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = this.getCSVHeaders(data[0]);
    const csvRows = [headers.join(',')];

    // Convert each object to CSV row
    data.forEach(item => {
      const row = headers.map(header => {
        const value = this.getNestedValue(item, header);
        // Escape commas and quotes in CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private getCSVHeaders(obj: any, prefix = ''): string[] {
    const headers: string[] = [];
    
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (Array.isArray(value)) {
        // For arrays, we'll flatten the first item if it exists
        if (value.length > 0 && typeof value[0] === 'object') {
          headers.push(...this.getCSVHeaders(value[0], fullKey));
        } else {
          headers.push(fullKey);
        }
      } else if (typeof value === 'object' && value !== null) {
        headers.push(...this.getCSVHeaders(value, fullKey));
      } else {
        headers.push(fullKey);
      }
    });
    
    return headers;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (Array.isArray(current)) {
        // For arrays, return the first item's value or join all values
        return current.length > 0 ? current[0][key] || current.map(item => item[key]).join(';') : '';
      }
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }
}