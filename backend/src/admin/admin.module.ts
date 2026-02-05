import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { InventoryIntegrationService } from './inventory-integration.service';
import { ValidationNotificationService } from './validation-notification.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Country } from '../entities/country.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SecurityAlert } from '../entities/security-alert.entity';
import { SupplierSubmission } from '../entities/supplier-submission.entity';
import { Supplier } from '../entities/supplier.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity } from '../entities/product-segment.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

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
      SupplierSubmission,
      Supplier,
      ProductPrice,
      Category,
      ProductSegmentEntity,
    ]),
    InventoryModule,
    OrdersModule,
    AuditModule,
    NotificationsModule,
    forwardRef(() => WhatsappModule),
  ],
  controllers: [AdminController, ValidationController],
  providers: [
    AdminService, 
    ValidationService, 
    InventoryIntegrationService,
    ValidationNotificationService,
  ],
  exports: [
    AdminService, 
    ValidationService,
    InventoryIntegrationService,
    ValidationNotificationService,
  ],
})
export class AdminModule {}