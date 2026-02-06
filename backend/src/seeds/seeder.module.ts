import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { User } from '../entities/user.entity';
import { Country } from '../entities/country.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { Role } from '../entities/role.entity';
import { DeliveryMethod } from '../entities/delivery-method.entity';
import { PickupPoint } from '../entities/pickup-point.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Country,
      Category,
      ProductSegmentEntity,
      Role,
      DeliveryMethod,
      PickupPoint,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
