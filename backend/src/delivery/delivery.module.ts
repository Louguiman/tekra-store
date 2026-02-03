import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryMethod } from '../entities/delivery-method.entity';
import { PickupPoint } from '../entities/pickup-point.entity';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { Country } from '../entities/country.entity';
import { Order } from '../entities/order.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryMethod,
      PickupPoint,
      DeliveryTracking,
      Country,
      Order,
    ]),
    AuditModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}