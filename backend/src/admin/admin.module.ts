import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      Product,
      InventoryItem,
      Country,
    ]),
    InventoryModule,
    OrdersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}