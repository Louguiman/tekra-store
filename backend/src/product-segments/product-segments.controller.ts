import { Controller, Get } from '@nestjs/common';
import { ProductSegmentsService } from './product-segments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('product-segments')
export class ProductSegmentsController {
  constructor(private readonly productSegmentsService: ProductSegmentsService) {}

  @Get()
  @Public()
  findAll() {
    return this.productSegmentsService.findAll();
  }
}