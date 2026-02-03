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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

    // In a real implementation, you would upload the file to a storage service
    // and get back a URL. For now, we'll simulate this with a placeholder URL.
    const imageUrl = `https://storage.example.com/products/${productId}/${file.originalname}`;

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
  deleteImage(@Param('imageId') imageId: string) {
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