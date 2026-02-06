import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Like, In } from 'typeorm';
import { Product, RefurbishedGrade } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
    @InjectRepository(ProductSpecification)
    private productSpecificationRepository: Repository<ProductSpecification>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductSegmentEntity)
    private segmentRepository: Repository<ProductSegmentEntity>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
  ) {}

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, segmentId, specifications, images, prices, ...productData } = createProductDto;

    // Validate category exists
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Validate segment exists
    const segment = await this.segmentRepository.findOne({ where: { id: segmentId } });
    if (!segment) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found`);
    }

    // Validate refurbished grade logic
    if (productData.isRefurbished && !productData.refurbishedGrade) {
      throw new BadRequestException('Refurbished products must have a grade (A, B, or C)');
    }
    if (!productData.isRefurbished && productData.refurbishedGrade) {
      throw new BadRequestException('Non-refurbished products cannot have a refurbished grade');
    }

    // Generate slug from name
    const slug = this.generateSlug(productData.name);

    // Create product
    const product = this.productRepository.create({
      ...productData,
      slug,
      category,
      segment,
    });

    const savedProduct = await this.productRepository.save(product);

    // Create specifications if provided
    if (specifications && specifications.length > 0) {
      const specEntities = specifications.map(spec =>
        this.productSpecificationRepository.create({
          ...spec,
          product: savedProduct,
        })
      );
      await this.productSpecificationRepository.save(specEntities);
    }

    // Create images if provided
    if (images && images.length > 0) {
      const imageEntities = images.map(image =>
        this.productImageRepository.create({
          ...image,
          product: savedProduct,
        })
      );
      await this.productImageRepository.save(imageEntities);
    }

    // Create prices
    const priceEntities = await Promise.all(
      prices.map(async (priceDto) => {
        const country = await this.countryRepository.findOne({ where: { id: priceDto.countryId } });
        if (!country) {
          throw new NotFoundException(`Country with ID ${priceDto.countryId} not found`);
        }
        return this.productPriceRepository.create({
          price: priceDto.price,
          promoPrice: priceDto.promoPrice,
          product: savedProduct,
          country,
        });
      })
    );
    await this.productPriceRepository.save(priceEntities);

    return this.getProductById(savedProduct.id);
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.getProductById(id);
    
    const { categoryId, segmentId, specifications, images, prices, ...productData } = updateProductDto;

    // Update basic product data
    if (Object.keys(productData).length > 0) {
      // Validate refurbished grade logic
      const isRefurbished = productData.isRefurbished ?? product.isRefurbished;
      const refurbishedGrade = productData.refurbishedGrade ?? product.refurbishedGrade;
      
      if (isRefurbished && !refurbishedGrade) {
        throw new BadRequestException('Refurbished products must have a grade (A, B, or C)');
      }
      if (!isRefurbished && refurbishedGrade) {
        throw new BadRequestException('Non-refurbished products cannot have a refurbished grade');
      }

      // Update slug if name changed
      if (productData.name && productData.name !== product.name) {
        (productData as any).slug = this.generateSlug(productData.name);
      }

      Object.assign(product, productData);
    }

    // Update category if provided
    if (categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      product.category = category;
    }

    // Update segment if provided
    if (segmentId) {
      const segment = await this.segmentRepository.findOne({ where: { id: segmentId } });
      if (!segment) {
        throw new NotFoundException(`Segment with ID ${segmentId} not found`);
      }
      product.segment = segment;
    }

    await this.productRepository.save(product);

    // Update specifications if provided
    if (specifications) {
      await this.productSpecificationRepository.delete({ product: { id } });
      if (specifications.length > 0) {
        const specEntities = specifications.map(spec =>
          this.productSpecificationRepository.create({
            ...spec,
            product,
          })
        );
        await this.productSpecificationRepository.save(specEntities);
      }
    }

    // Update images if provided
    if (images) {
      await this.productImageRepository.delete({ product: { id } });
      if (images.length > 0) {
        const imageEntities = images.map(image =>
          this.productImageRepository.create({
            ...image,
            product,
          })
        );
        await this.productImageRepository.save(imageEntities);
      }
    }

    // Update prices if provided
    if (prices) {
      await this.productPriceRepository.delete({ product: { id } });
      const priceEntities = await Promise.all(
        prices.map(async (priceDto) => {
          const country = await this.countryRepository.findOne({ where: { id: priceDto.countryId } });
          if (!country) {
            throw new NotFoundException(`Country with ID ${priceDto.countryId} not found`);
          }
          return this.productPriceRepository.create({
            price: priceDto.price,
            promoPrice: priceDto.promoPrice,
            product,
            country,
          });
        })
      );
      await this.productPriceRepository.save(priceEntities);
    }

    return this.getProductById(id);
  }

  async getProducts(filters: ProductFiltersDto): Promise<PaginatedProducts> {
    const queryBuilder = this.createProductQueryBuilder();

    this.applyFilters(queryBuilder, filters);
    this.applySorting(queryBuilder, filters);

    const total = await queryBuilder.getCount();
    
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    
    const products = await queryBuilder
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: [
        'category',
        'segment',
        'prices',
        'prices.country',
        'images',
        'specifications',
        'inventory',
      ],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: [
        'category',
        'segment',
        'prices',
        'prices.country',
        'images',
        'specifications',
        'inventory',
      ],
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.getProductById(id);
    await this.productRepository.remove(product);
  }

  async uploadProductImage(productId: string, imageUrl: string, altText?: string, sortOrder?: number, isPrimary?: boolean): Promise<ProductImage> {
    const product = await this.getProductById(productId);

    // If this is set as primary, unset other primary images
    if (isPrimary) {
      await this.productImageRepository.update(
        { product: { id: productId } },
        { isPrimary: false }
      );
    }

    const image = this.productImageRepository.create({
      url: imageUrl,
      altText,
      sortOrder: sortOrder ?? 0,
      isPrimary: isPrimary ?? false,
      product,
    });

    return this.productImageRepository.save(image);
  }

  async deleteProductImage(imageId: string): Promise<void> {
    const image = await this.productImageRepository.findOne({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }
    await this.productImageRepository.remove(image);
  }

  async assignRefurbishedGrade(productId: string, grade: RefurbishedGrade): Promise<Product> {
    const product = await this.getProductById(productId);
    
    if (!product.isRefurbished) {
      throw new BadRequestException('Cannot assign refurbished grade to non-refurbished product');
    }

    product.refurbishedGrade = grade;
    await this.productRepository.save(product);

    return this.getProductById(productId);
  }

  private createProductQueryBuilder(): SelectQueryBuilder<Product> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.segment', 'segment')
      .leftJoinAndSelect('product.prices', 'prices')
      .leftJoinAndSelect('prices.country', 'country')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.specifications', 'specifications')
      .leftJoinAndSelect('product.inventory', 'inventory');
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<Product>, filters: ProductFiltersDto): void {
    if (filters.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      queryBuilder.andWhere('product.category.id IN (:...categoryIds)', { categoryIds: filters.categoryIds });
    }

    if (filters.segmentIds && filters.segmentIds.length > 0) {
      queryBuilder.andWhere('product.segment.id IN (:...segmentIds)', { segmentIds: filters.segmentIds });
    }

    if (filters.brands && filters.brands.length > 0) {
      queryBuilder.andWhere('product.brand IN (:...brands)', { brands: filters.brands });
    }

    if (filters.isRefurbished !== undefined) {
      queryBuilder.andWhere('product.isRefurbished = :isRefurbished', { isRefurbished: filters.isRefurbished });
    }

    if (filters.refurbishedGrades && filters.refurbishedGrades.length > 0) {
      queryBuilder.andWhere('product.refurbishedGrade IN (:...refurbishedGrades)', { refurbishedGrades: filters.refurbishedGrades });
    }

    // Handle both countryId and countryCode for price filtering
    const countryFilter = filters.countryId || filters.countryCode;
    if (countryFilter && (filters.minPrice !== undefined || filters.maxPrice !== undefined)) {
      // If countryCode is provided, filter by country code, otherwise by ID
      const countryField = filters.countryCode ? 'prices.country.code' : 'prices.country.id';
      
      if (filters.minPrice !== undefined) {
        queryBuilder.andWhere(`${countryField} = :countryFilter AND prices.price >= :minPrice`, {
          countryFilter,
          minPrice: filters.minPrice,
        });
      }
      if (filters.maxPrice !== undefined) {
        queryBuilder.andWhere(`${countryField} = :countryFilter AND prices.price <= :maxPrice`, {
          countryFilter,
          maxPrice: filters.maxPrice,
        });
      }
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Product>, filters: ProductFiltersDto): void {
    const { sortBy = 'createdAt', sortOrder = 'DESC' } = filters;
    
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'brand'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Normalize sortOrder to uppercase (TypeORM only accepts 'ASC' or 'DESC')
    const normalizedSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    queryBuilder.orderBy(`product.${sortField}`, normalizedSortOrder);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Homepage specific methods

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    // Get products with high ratings or marked as featured
    // For now, we'll get the newest products with images
    return this.productRepository.find({
      relations: ['category', 'segment', 'prices', 'prices.country', 'images', 'inventory'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getTrendingProducts(limit: number = 8): Promise<Product[]> {
    // Get products that are popular (most viewed/purchased)
    // For now, we'll get products with good inventory
    const queryBuilder = this.createProductQueryBuilder();
    
    queryBuilder
      .where('inventory.quantity > :minQuantity', { minQuantity: 0 })
      .orderBy('product.createdAt', 'DESC')
      .take(limit);

    return queryBuilder.getMany();
  }

  async getDealsProducts(limit: number = 8): Promise<Product[]> {
    // Get refurbished products or products with special pricing
    return this.productRepository.find({
      relations: ['category', 'segment', 'prices', 'prices.country', 'images', 'inventory'],
      where: { 
        isRefurbished: true,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getNewArrivals(limit: number = 8): Promise<Product[]> {
    // Get the newest products
    return this.productRepository.find({
      relations: ['category', 'segment', 'prices', 'prices.country', 'images', 'inventory'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}