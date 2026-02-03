import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { InventoryModule } from './inventory.module';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Product } from '../entities/product.entity';
import { User, UserRole } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Country } from '../entities/country.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('Inventory Management Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let testProduct: Product;
  let testInventoryItem: InventoryItem;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            InventoryItem,
            StockReservation,
            Product,
            User,
            Category,
            ProductSegmentEntity,
            Country,
            ProductPrice,
          ],
          synchronize: true,
          logging: false,
        }),
        InventoryModule,
        AuthModule,
        ProductsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up reservations before each test
    await dataSource.getRepository(StockReservation).clear();
  });

  async function setupTestData() {
    // Create users with correct role enum values
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await dataSource.getRepository(User).save({
      fullName: 'Admin User',
      email: 'admin@test.com',
      phone: '+22312345678',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
    });

    const staffUser = await dataSource.getRepository(User).save({
      fullName: 'Staff User',
      email: 'staff@test.com',
      phone: '+22312345679',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
    });

    const customerUser = await dataSource.getRepository(User).save({
      fullName: 'Customer User',
      email: 'customer@test.com',
      phone: '+22312345680',
      passwordHash: hashedPassword,
      role: UserRole.CUSTOMER,
    });

    // Create JWT tokens
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: UserRole.ADMIN });
    staffToken = jwtService.sign({ sub: staffUser.id, email: staffUser.email, role: UserRole.STAFF });
    customerToken = jwtService.sign({ sub: customerUser.id, email: customerUser.email, role: UserRole.CUSTOMER });

    // Create country
    const country = await dataSource.getRepository(Country).save({
      code: 'ML',
      name: 'Mali',
      currency: 'FCFA',
    });

    // Create category
    const category = await dataSource.getRepository(Category).save({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices',
    });

    // Create product segment
    const segment = await dataSource.getRepository(ProductSegmentEntity).save({
      name: ProductSegment.PREMIUM,
      description: 'Premium products',
    });

    // Create test product
    testProduct = await dataSource.getRepository(Product).save({
      name: 'Test Laptop',
      slug: 'test-laptop',
      description: 'A test laptop for integration testing',
      brand: 'TestBrand',
      isRefurbished: false,
      warrantyMonths: 12,
      category,
      segment,
    });

    // Create product price
    await dataSource.getRepository(ProductPrice).save({
      product: testProduct,
      country,
      price: 500000,
    });

    // Create test inventory item
    testInventoryItem = await dataSource.getRepository(InventoryItem).save({
      product: testProduct,
      quantity: 100,
      warehouseLocation: 'Warehouse A',
      supplierId: 'supplier-001',
      lowStockThreshold: 10,
    });
  }

  describe('GET /inventory', () => {
    it('should return all inventory items for admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: testInventoryItem.id,
        quantity: 100,
        warehouseLocation: 'Warehouse A',
        supplierId: 'supplier-001',
        lowStockThreshold: 10,
        product: expect.objectContaining({
          id: testProduct.id,
          name: 'Test Laptop',
        }),
      });
    });

    it('should return all inventory items for staff users', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should deny access for customer users', async () => {
      await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should deny access for unauthenticated users', async () => {
      await request(app.getHttpServer())
        .get('/inventory')
        .expect(401);
    });
  });

  describe('GET /inventory/product/:productId', () => {
    it('should return inventory for specific product', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testInventoryItem.id,
        quantity: 100,
        product: expect.objectContaining({
          id: testProduct.id,
        }),
      });
    });

    it('should return null for non-existent product', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/inventory/product/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe('PUT /inventory/product/:productId/stock - Stock Updates', () => {
    it('should update existing inventory stock successfully', async () => {
      const updateData = {
        quantity: 150,
        warehouseLocation: 'Warehouse B',
        supplierId: 'supplier-002',
        lowStockThreshold: 15,
      };

      const response = await request(app.getHttpServer())
        .put(`/inventory/product/${testProduct.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        quantity: 150,
        warehouseLocation: 'Warehouse B',
        supplierId: 'supplier-002',
        lowStockThreshold: 15,
      });

      // Verify database was updated
      const updatedItem = await dataSource.getRepository(InventoryItem).findOne({
        where: { product: { id: testProduct.id } },
      });
      expect(updatedItem.quantity).toBe(150);
      expect(updatedItem.warehouseLocation).toBe('Warehouse B');
    });

    it('should create new inventory item when none exists', async () => {
      // Create a new product without inventory
      const newProduct = await dataSource.getRepository(Product).save({
        name: 'New Test Product',
        slug: 'new-test-product',
        description: 'A new test product',
        brand: 'TestBrand',
        isRefurbished: false,
        warrantyMonths: 12,
        category: testProduct.category,
        segment: testProduct.segment,
      });

      const updateData = {
        quantity: 50,
        warehouseLocation: 'Warehouse C',
        supplierId: 'supplier-003',
        lowStockThreshold: 5,
      };

      const response = await request(app.getHttpServer())
        .put(`/inventory/product/${newProduct.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        quantity: 50,
        warehouseLocation: 'Warehouse C',
        supplierId: 'supplier-003',
        lowStockThreshold: 5,
      });

      // Verify new inventory item was created
      const newInventoryItem = await dataSource.getRepository(InventoryItem).findOne({
        where: { product: { id: newProduct.id } },
      });
      expect(newInventoryItem).toBeTruthy();
      expect(newInventoryItem.quantity).toBe(50);
    });

    it('should allow staff users to update stock', async () => {
      const updateData = { quantity: 75 };

      await request(app.getHttpServer())
        .put(`/inventory/product/${testProduct.id}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should deny access for customer users', async () => {
      const updateData = { quantity: 75 };

      await request(app.getHttpServer())
        .put(`/inventory/product/${testProduct.id}/stock`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { quantity: 50 };

      await request(app.getHttpServer())
        .put(`/inventory/product/${nonExistentId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('POST /inventory/product/:productId/adjust - Stock Adjustments', () => {
    it('should adjust stock positively', async () => {
      const initialQuantity = testInventoryItem.quantity;
      const adjustment = { adjustment: 25, reason: 'New stock received' };

      const response = await request(app.getHttpServer())
        .post(`/inventory/product/${testProduct.id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adjustment)
        .expect(200);

      expect(response.body.quantity).toBe(initialQuantity + 25);

      // Verify database was updated
      const updatedItem = await dataSource.getRepository(InventoryItem).findOne({
        where: { product: { id: testProduct.id } },
      });
      expect(updatedItem.quantity).toBe(initialQuantity + 25);
    });

    it('should adjust stock negatively', async () => {
      const initialQuantity = testInventoryItem.quantity;
      const adjustment = { adjustment: -15, reason: 'Damaged items removed' };

      const response = await request(app.getHttpServer())
        .post(`/inventory/product/${testProduct.id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adjustment)
        .expect(200);

      expect(response.body.quantity).toBe(initialQuantity - 15);
    });

    it('should prevent negative stock quantities', async () => {
      const adjustment = { adjustment: -200, reason: 'Large removal' };

      await request(app.getHttpServer())
        .post(`/inventory/product/${testProduct.id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adjustment)
        .expect(400);
    });

    it('should allow staff users to adjust stock', async () => {
      const adjustment = { adjustment: 10, reason: 'Staff adjustment' };

      await request(app.getHttpServer())
        .post(`/inventory/product/${testProduct.id}/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(adjustment)
        .expect(200);
    });
  });

  describe('GET /inventory/low-stock - Low Stock Alerts', () => {
    beforeEach(async () => {
      // Reset test inventory item to known state
      await dataSource.getRepository(InventoryItem).update(
        { id: testInventoryItem.id },
        { quantity: 100, lowStockThreshold: 10 }
      );
    });

    it('should return empty array when no items are low stock', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return low stock items when quantity is below threshold', async () => {
      // Update inventory to be low stock
      await dataSource.getRepository(InventoryItem).update(
        { id: testInventoryItem.id },
        { quantity: 5 }
      );

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        productId: testProduct.id,
        productName: 'Test Laptop',
        currentQuantity: 5,
        lowStockThreshold: 10,
        warehouseLocation: 'Warehouse A',
        supplierId: 'supplier-001',
      });
    });

    it('should return items with zero stock', async () => {
      // Update inventory to be out of stock
      await dataSource.getRepository(InventoryItem).update(
        { id: testInventoryItem.id },
        { quantity: 0 }
      );

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].currentQuantity).toBe(0);
    });

    it('should use custom threshold when provided', async () => {
      // Set quantity to 50, which is above default threshold (10) but below custom threshold (60)
      await dataSource.getRepository(InventoryItem).update(
        { id: testInventoryItem.id },
        { quantity: 50 }
      );

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock?threshold=60')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].currentQuantity).toBe(50);
    });

    it('should allow staff users to view low stock alerts', async () => {
      await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should deny access for customer users', async () => {
      await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('GET /inventory/availability/:productId - Stock Availability', () => {
    it('should return true when sufficient stock available', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=50`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        productId: testProduct.id,
        quantity: 50,
        available: true,
      });
    });

    it('should return false when insufficient stock available', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=150`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        productId: testProduct.id,
        quantity: 150,
        available: false,
      });
    });

    it('should consider reserved stock in availability calculation', async () => {
      // Create a stock reservation
      await dataSource.getRepository(StockReservation).save({
        productId: testProduct.id,
        quantity: 80,
        reservationReference: 'test-reservation',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      });

      // Available stock should be 100 - 80 = 20
      const response = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=25`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.available).toBe(false);

      // But 15 should be available
      const response2 = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=15`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.available).toBe(true);
    });

    it('should return false for non-existent product', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/inventory/availability/${nonExistentId}?quantity=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.available).toBe(false);
    });
  });

  describe('Stock Reservations', () => {
    it('should create stock reservation successfully', async () => {
      const reservationData = {
        productId: testProduct.id,
        quantity: 10,
        reservationReference: 'order-123',
      };

      const response = await request(app.getHttpServer())
        .post('/inventory/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reservationData)
        .expect(201);

      expect(response.body).toMatchObject({
        productId: testProduct.id,
        quantity: 10,
        reservationReference: 'order-123',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should prevent reservation when insufficient stock', async () => {
      const reservationData = {
        productId: testProduct.id,
        quantity: 150, // More than available (100)
        reservationReference: 'order-456',
      };

      await request(app.getHttpServer())
        .post('/inventory/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reservationData)
        .expect(400);
    });

    it('should release reservation successfully', async () => {
      // Create a reservation first
      const reservation = await dataSource.getRepository(StockReservation).save({
        productId: testProduct.id,
        quantity: 10,
        reservationReference: 'test-release',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await request(app.getHttpServer())
        .delete(`/inventory/reservations/${reservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify reservation was deleted
      const deletedReservation = await dataSource.getRepository(StockReservation).findOne({
        where: { id: reservation.id },
      });
      expect(deletedReservation).toBeNull();
    });
  });

  describe('Integration Flow - Complete Stock Management Cycle', () => {
    it('should handle complete stock management workflow', async () => {
      // 1. Check initial stock levels
      let response = await request(app.getHttpServer())
        .get(`/inventory/product/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const initialQuantity = response.body.quantity;
      expect(initialQuantity).toBe(100);

      // 2. Create a stock reservation
      const reservationResponse = await request(app.getHttpServer())
        .post('/inventory/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          quantity: 20,
          reservationReference: 'integration-test',
        })
        .expect(201);

      const reservationId = reservationResponse.body.id;

      // 3. Check availability with reservation in place
      response = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=85`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.available).toBe(false); // 100 - 20 reserved = 80 available

      // 4. Adjust stock (add more inventory)
      await request(app.getHttpServer())
        .post(`/inventory/product/${testProduct.id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adjustment: 50, reason: 'New shipment received' })
        .expect(200);

      // 5. Check availability again
      response = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=85`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.available).toBe(true); // 150 - 20 reserved = 130 available

      // 6. Release the reservation
      await request(app.getHttpServer())
        .delete(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 7. Update stock to trigger low stock alert
      await request(app.getHttpServer())
        .put(`/inventory/product/${testProduct.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5, lowStockThreshold: 10 })
        .expect(200);

      // 8. Check low stock alerts
      response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].currentQuantity).toBe(5);
      expect(response.body[0].productName).toBe('Test Laptop');
    });
  });

  describe('Real-time Stock Updates', () => {
    it('should reflect stock changes immediately across all endpoints', async () => {
      // Initial state check
      let inventoryResponse = await request(app.getHttpServer())
        .get(`/inventory/product/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inventoryResponse.body.quantity).toBe(100);

      // Update stock
      await request(app.getHttpServer())
        .put(`/inventory/product/${testProduct.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 75 })
        .expect(200);

      // Verify change is reflected in all inventory endpoints
      inventoryResponse = await request(app.getHttpServer())
        .get(`/inventory/product/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inventoryResponse.body.quantity).toBe(75);

      // Check in all inventory list
      const allInventoryResponse = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedItem = allInventoryResponse.body.find(item => item.product.id === testProduct.id);
      expect(updatedItem.quantity).toBe(75);

      // Check availability calculation
      const availabilityResponse = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=75`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(availabilityResponse.body.available).toBe(true);

      const unavailableResponse = await request(app.getHttpServer())
        .get(`/inventory/availability/${testProduct.id}?quantity=76`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unavailableResponse.body.available).toBe(false);
    });
  });
});