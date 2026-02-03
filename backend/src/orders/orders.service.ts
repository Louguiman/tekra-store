import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { Country } from '../entities/country.entity';
import { User } from '../entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, deliveryAddress, countryId, customerEmail, customerPhone, userId } = createOrderDto;

    // Validate country exists
    const country = await this.countryRepository.findOne({ where: { id: countryId } });
    if (!country) {
      throw new NotFoundException('Country not found');
    }

    // Validate user if provided
    let user: User | null = null;
    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    // Validate products and check stock availability
    const orderItems: { product: Product; quantity: number; unitPrice: number }[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
        relations: ['prices'],
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      // Check stock availability
      const isAvailable = await this.inventoryService.checkAvailability(item.productId, item.quantity);
      if (!isAvailable) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }

      // Get price for the country
      const productPrice = product.prices.find(p => p.country.id === countryId);
      if (!productPrice) {
        throw new BadRequestException(`Product ${product.name} is not available in the selected country`);
      }

      const unitPrice = productPrice.promoPrice || productPrice.price;
      orderItems.push({
        product,
        quantity: item.quantity,
        unitPrice,
      });

      totalAmount += unitPrice * item.quantity;
    }

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      status: OrderStatus.PENDING,
      totalAmount,
      deliveryFee: 0, // Will be calculated based on delivery method
      deliveryAddress,
      customerEmail,
      customerPhone,
      country,
      user,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items and reserve stock
    for (const item of orderItems) {
      const orderItem = this.orderItemRepository.create({
        order: savedOrder,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      });

      await this.orderItemRepository.save(orderItem);

      // Reserve stock
      await this.inventoryService.reserveStock({
        productId: item.product.id,
        quantity: item.quantity,
        reservationReference: savedOrder.orderNumber,
      });
    }

    // Send order confirmation notifications
    try {
      await this.notificationsService.sendOrderConfirmationNotification(
        savedOrder.orderNumber,
        savedOrder.customerEmail,
        savedOrder.customerPhone,
        savedOrder.totalAmount,
        { items: orderItems, deliveryAddress: savedOrder.deliveryAddress }
      );
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('Failed to send order confirmation notifications:', error);
    }

    return this.findOne(savedOrder.id);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['items', 'items.product', 'country', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.images', 'country', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['items', 'items.product', 'items.product.images', 'country', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.images', 'country'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCountry(countryId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { country: { id: countryId } },
      relations: ['items', 'items.product', 'country', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;
    
    order.status = updateOrderStatusDto.status;
    await this.orderRepository.save(order);

    // Send order status change notifications
    try {
      await this.notificationsService.sendOrderStatusNotification({
        orderId: order.id,
        newStatus: order.status,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        orderNumber: order.orderNumber,
        trackingNumber: updateOrderStatusDto.trackingNumber,
      });
    } catch (error) {
      // Log error but don't fail the status update
      console.error('Failed to send order status notifications:', error);
    }

    return this.findOne(id);
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status },
      relations: ['items', 'items.product', 'country', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }
}