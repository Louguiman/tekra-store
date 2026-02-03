import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSegmentEntity } from '../entities/product-segment.entity';

@Injectable()
export class ProductSegmentsService {
  constructor(
    @InjectRepository(ProductSegmentEntity)
    private segmentRepository: Repository<ProductSegmentEntity>,
  ) {}

  async findAll(): Promise<ProductSegmentEntity[]> {
    return this.segmentRepository.find({
      order: { name: 'ASC' },
    });
  }
}