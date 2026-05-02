import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RefurbishedGrade } from '../entities/product.entity';
import { UserRole } from '../entities/user.entity';
import { StorageService } from '../common/storage/storage.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(createProductDto);
  }

  @Get()
  @Public()
  findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.getProducts(filters);
  }

  @Get('featured')
  @Public()
  getFeatured(@Query('limit') limit?: number) {
    return this.productsService.getFeaturedProducts(limit);
  }

  @Get('trending')
  @Public()
  getTrending(@Query('limit') limit?: number) {
    return this.productsService.getTrendingProducts(limit);
  }

  @Get('deals')
  @Public()
  getDeals(@Query('limit') limit?: number) {
    return this.productsService.getDealsProducts(limit);
  }

  @Get('new-arrivals')
  @Public()
  getNewArrivals(@Query('limit') limit?: number) {
    return this.productsService.getNewArrivals(limit);
  }

  @Get('search')
  @Public()
  search(@Query() filters: ProductFiltersDto) {
    return this.productsService.getProducts(filters);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.getProductBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Upload the file to Cloudflare R2
    const imageUrl = await this.storageService.uploadFile(file, 'products');

    return this.productsService.uploadProductImage(
      productId,
      imageUrl,
      uploadImageDto.altText,
      uploadImageDto.sortOrder,
      uploadImageDto.isPrimary,
    );
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async deleteImage(@Param('imageId') imageId: string) {
    // Get image to find URL
    const image = await this.productsService.getProductImage(imageId);
    if (image) {
      // Delete from storage
      await this.storageService.deleteFile(image.url);
    }
    return this.productsService.deleteProductImage(imageId);
  }

  @Patch(':id/refurbished-grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  assignRefurbishedGrade(
    @Param('id') productId: string,
    @Body('grade') grade: RefurbishedGrade,
  ) {
    return this.productsService.assignRefurbishedGrade(productId, grade);
  }
}