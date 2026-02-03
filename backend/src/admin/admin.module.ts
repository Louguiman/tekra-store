import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SecurityAlert } from '../entities/security-alert.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      Product,
      InventoryItem,
      Country,
      AuditLog,
      SecurityAlert,
    ]),
    InventoryModule,
    OrdersModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}