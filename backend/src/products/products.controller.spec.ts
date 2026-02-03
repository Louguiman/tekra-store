import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { RefurbishedGrade } from '../entities/product.entity';
import { BadRequestException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

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
    category: null,
    segment: null,
    prices: [],
    images: [],
    specifications: [],
    inventory: [],
    orderItems: [],
  };

  const mockPaginatedProducts = {
    products: [mockProduct],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            createProduct: jest.fn(),
            getProducts: jest.fn(),
            getProductById: jest.fn(),
            getProductBySlug: jest.fn(),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn(),
            uploadProductImage: jest.fn(),
            deleteProductImage: jest.fn(),
            assignRefurbishedGrade: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createProductDto = {
        name: 'Test Product',
        categoryId: '1',
        segmentId: '1',
        prices: [{ countryId: '1', price: 100000 }],
      };

      jest.spyOn(service, 'createProduct').mockResolvedValue(mockProduct as any);

      const result = await controller.create(createProductDto);

      expect(result).toEqual(mockProduct);
      expect(service.createProduct).toHaveBeenCalledWith(createProductDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const filters = { page: 1, limit: 20 };

      jest.spyOn(service, 'getProducts').mockResolvedValue(mockPaginatedProducts);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockPaginatedProducts);
      expect(service.getProducts).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue(mockProduct as any);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(service.getProductById).toHaveBeenCalledWith('1');
    });
  });

  describe('findBySlug', () => {
    it('should return a product by slug', async () => {
      jest.spyOn(service, 'getProductBySlug').mockResolvedValue(mockProduct as any);

      const result = await controller.findBySlug('test-product');

      expect(result).toEqual(mockProduct);
      expect(service.getProductBySlug).toHaveBeenCalledWith('test-product');
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto = { name: 'Updated Product' };
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };

      jest.spyOn(service, 'updateProduct').mockResolvedValue(updatedProduct as any);

      const result = await controller.update('1', updateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(service.updateProduct).toHaveBeenCalledWith('1', updateProductDto);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      jest.spyOn(service, 'deleteProduct').mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.deleteProduct).toHaveBeenCalledWith('1');
    });
  });

  describe('uploadImage', () => {
    it('should upload an image', async () => {
      const file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const uploadImageDto = {
        productId: '1',
        altText: 'Test image',
        sortOrder: 0,
        isPrimary: true,
      };

      const mockImage = {
        id: '1',
        url: 'https://storage.example.com/products/1/test.jpg',
        altText: 'Test image',
        sortOrder: 0,
        isPrimary: true,
      };

      jest.spyOn(service, 'uploadProductImage').mockResolvedValue(mockImage as any);

      const result = await controller.uploadImage('1', file, uploadImageDto);

      expect(result).toEqual(mockImage);
      expect(service.uploadProductImage).toHaveBeenCalledWith(
        '1',
        'https://storage.example.com/products/1/test.jpg',
        'Test image',
        0,
        true,
      );
    });

    it('should throw BadRequestException when no file provided', async () => {
      const uploadImageDto = { productId: '1' };

      await expect(controller.uploadImage('1', undefined, uploadImageDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignRefurbishedGrade', () => {
    it('should assign refurbished grade', async () => {
      const refurbishedProduct = { ...mockProduct, isRefurbished: true, refurbishedGrade: RefurbishedGrade.A };

      jest.spyOn(service, 'assignRefurbishedGrade').mockResolvedValue(refurbishedProduct as any);

      const result = await controller.assignRefurbishedGrade('1', RefurbishedGrade.A);

      expect(result).toEqual(refurbishedProduct);
      expect(service.assignRefurbishedGrade).toHaveBeenCalledWith('1', RefurbishedGrade.A);
    });
  });
});