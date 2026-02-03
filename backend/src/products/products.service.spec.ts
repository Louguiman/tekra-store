import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product, RefurbishedGrade } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductSpecification } from '../entities/product-specification.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let productImageRepository: Repository<ProductImage>;
  let categoryRepository: Repository<Category>;
  let segmentRepository: Repository<ProductSegmentEntity>;
  let countryRepository: Repository<Country>;

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test Description',
    brand: 'Test Brand',
    isRefurbished: false,
    refurbishedGrade: null,
    warrantyMonths: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory = {
    id: '1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
  };

  const mockSegment = {
    id: '1',
    name: ProductSegment.PREMIUM,
    description: 'Premium products',
  };

  const mockCountry = {
    id: '1',
    code: 'ML',
    name: 'Mali',
    currency: 'FCFA',
  };

  const mockProductImage = {
    id: '1',
    url: 'https://example.com/image.jpg',
    altText: 'Test Image',
    sortOrder: 0,
    isPrimary: true,
    product: mockProduct,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductPrice),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductSpecification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductSegmentEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Country),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    productImageRepository = module.get<Repository<ProductImage>>(getRepositoryToken(ProductImage));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    segmentRepository = module.get<Repository<ProductSegmentEntity>>(getRepositoryToken(ProductSegmentEntity));
    countryRepository = module.get<Repository<Country>>(getRepositoryToken(Country));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test product creation
  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const createProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        categoryId: '1',
        segmentId: '1',
        brand: 'Test Brand',
        isRefurbished: false,
        warrantyMonths: 12,
        prices: [{ countryId: '1', price: 100000 }],
      };

      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory as Category);
      jest.spyOn(segmentRepository, 'findOne').mockResolvedValue(mockSegment as ProductSegmentEntity);
      jest.spyOn(countryRepository, 'findOne').mockResolvedValue(mockCountry as Country);
      jest.spyOn(productRepository, 'create').mockReturnValue(mockProduct as Product);
      jest.spyOn(productRepository, 'save').mockResolvedValue(mockProduct as Product);
      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);

      const result = await service.createProduct(createProductDto);

      expect(result).toEqual(mockProduct);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(segmentRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when category not found', async () => {
      const createProductDto = {
        name: 'Test Product',
        categoryId: 'invalid-id',
        segmentId: '1',
        prices: [{ countryId: '1', price: 100000 }],
      };

      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createProduct(createProductDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for refurbished product without grade', async () => {
      const createProductDto = {
        name: 'Test Product',
        categoryId: '1',
        segmentId: '1',
        isRefurbished: true,
        prices: [{ countryId: '1', price: 100000 }],
      };

      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory as Category);
      jest.spyOn(segmentRepository, 'findOne').mockResolvedValue(mockSegment as ProductSegmentEntity);

      await expect(service.createProduct(createProductDto)).rejects.toThrow(BadRequestException);
    });
  });

  // Test product updates
  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const updateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
      };

      const updatedProduct = { ...mockProduct, ...updateProductDto };
      jest.spyOn(service, 'getProductById')
        .mockResolvedValueOnce(mockProduct as Product)
        .mockResolvedValueOnce(updatedProduct as Product);
      jest.spyOn(productRepository, 'save').mockResolvedValue(updatedProduct as Product);

      const result = await service.updateProduct('1', updateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product not found for update', async () => {
      const updateProductDto = { name: 'Updated Product' };
      jest.spyOn(service, 'getProductById').mockRejectedValue(new NotFoundException());

      await expect(service.updateProduct('invalid-id', updateProductDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate refurbished grade logic on update', async () => {
      const updateProductDto = { isRefurbished: true };

      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);

      await expect(service.updateProduct('1', updateProductDto)).rejects.toThrow(BadRequestException);
    });
  });

  // Test product deletion
  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);
      jest.spyOn(productRepository, 'remove').mockResolvedValue(mockProduct as Product);

      await service.deleteProduct('1');

      expect(service.getProductById).toHaveBeenCalledWith('1');
      expect(productRepository.remove).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw NotFoundException when product not found for deletion', async () => {
      jest.spyOn(service, 'getProductById').mockRejectedValue(new NotFoundException());

      await expect(service.deleteProduct('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // Test image upload edge cases
  describe('uploadProductImage', () => {
    it('should upload product image successfully', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const altText = 'Product image';

      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);
      jest.spyOn(productImageRepository, 'create').mockReturnValue(mockProductImage as ProductImage);
      jest.spyOn(productImageRepository, 'save').mockResolvedValue(mockProductImage as ProductImage);

      const result = await service.uploadProductImage('1', imageUrl, altText);

      expect(result).toEqual(mockProductImage);
      expect(productImageRepository.create).toHaveBeenCalledWith({
        url: imageUrl,
        altText,
        sortOrder: 0,
        isPrimary: false,
        product: mockProduct,
      });
    });

    it('should set image as primary and unset other primary images', async () => {
      const imageUrl = 'https://example.com/image.jpg';

      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);
      jest.spyOn(productImageRepository, 'update').mockResolvedValue({} as any);
      jest.spyOn(productImageRepository, 'create').mockReturnValue(mockProductImage as ProductImage);
      jest.spyOn(productImageRepository, 'save').mockResolvedValue(mockProductImage as ProductImage);

      await service.uploadProductImage('1', imageUrl, undefined, undefined, true);

      expect(productImageRepository.update).toHaveBeenCalledWith(
        { product: { id: '1' } },
        { isPrimary: false }
      );
    });

    it('should throw NotFoundException when product not found for image upload', async () => {
      jest.spyOn(service, 'getProductById').mockRejectedValue(new NotFoundException());

      await expect(service.uploadProductImage('invalid-id', 'url')).rejects.toThrow(NotFoundException);
    });

    it('should handle empty image URL edge case', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);
      jest.spyOn(productImageRepository, 'create').mockReturnValue(mockProductImage as ProductImage);
      jest.spyOn(productImageRepository, 'save').mockResolvedValue(mockProductImage as ProductImage);

      await service.uploadProductImage('1', '');
      
      expect(productImageRepository.create).toHaveBeenCalledWith({
        url: '',
        altText: undefined,
        sortOrder: 0,
        isPrimary: false,
        product: mockProduct,
      });
    });

    it('should handle large sort order values', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const largeSortOrder = 999999;

      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);
      jest.spyOn(productImageRepository, 'create').mockReturnValue(mockProductImage as ProductImage);
      jest.spyOn(productImageRepository, 'save').mockResolvedValue(mockProductImage as ProductImage);

      await service.uploadProductImage('1', imageUrl, undefined, largeSortOrder, false);

      expect(productImageRepository.create).toHaveBeenCalledWith({
        url: imageUrl,
        altText: undefined,
        sortOrder: largeSortOrder,
        isPrimary: false,
        product: mockProduct,
      });
    });
  });

  describe('deleteProductImage', () => {
    it('should delete product image successfully', async () => {
      jest.spyOn(productImageRepository, 'findOne').mockResolvedValue(mockProductImage as ProductImage);
      jest.spyOn(productImageRepository, 'remove').mockResolvedValue(mockProductImage as ProductImage);

      await service.deleteProductImage('1');

      expect(productImageRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(productImageRepository.remove).toHaveBeenCalledWith(mockProductImage);
    });

    it('should throw NotFoundException when image not found for deletion', async () => {
      jest.spyOn(productImageRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteProductImage('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductById', () => {
    it('should return a product when found', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as Product);

      const result = await service.getProductById('1');

      expect(result).toEqual(mockProduct);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
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
    });

    it('should throw NotFoundException when product not found', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProductById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRefurbishedGrade', () => {
    it('should assign grade to refurbished product', async () => {
      const refurbishedProduct = { ...mockProduct, isRefurbished: true };
      jest.spyOn(service, 'getProductById')
        .mockResolvedValueOnce(refurbishedProduct as Product)
        .mockResolvedValueOnce({ ...refurbishedProduct, refurbishedGrade: RefurbishedGrade.A } as Product);
      jest.spyOn(productRepository, 'save').mockResolvedValue(refurbishedProduct as Product);

      const result = await service.assignRefurbishedGrade('1', RefurbishedGrade.A);

      expect(result.refurbishedGrade).toBe(RefurbishedGrade.A);
    });

    it('should throw BadRequestException for non-refurbished product', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as Product);

      await expect(service.assignRefurbishedGrade('1', RefurbishedGrade.A)).rejects.toThrow(BadRequestException);
    });
  });
});