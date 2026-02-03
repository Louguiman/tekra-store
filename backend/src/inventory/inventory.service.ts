import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Product } from '../entities/product.entity';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateStockReservationDto, StockReservationResponseDto } from './dto/stock-reservation.dto';
import { LowStockAlertDto } from './dto/low-stock-alert.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(StockReservation)
    private reservationRepository: Repository<StockReservation>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async updateStock(productId: string, updateStockDto: UpdateStockDto): Promise<InventoryItem> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    let inventoryItem = await this.inventoryRepository.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });

    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = this.inventoryRepository.create({
        product,
        quantity: updateStockDto.quantity,
        warehouseLocation: updateStockDto.warehouseLocation,
        supplierId: updateStockDto.supplierId,
        lowStockThreshold: updateStockDto.lowStockThreshold || 10,
      });
    } else {
      // Update existing inventory item
      inventoryItem.quantity = updateStockDto.quantity;
      if (updateStockDto.warehouseLocation !== undefined) {
        inventoryItem.warehouseLocation = updateStockDto.warehouseLocation;
      }
      if (updateStockDto.supplierId !== undefined) {
        inventoryItem.supplierId = updateStockDto.supplierId;
      }
      if (updateStockDto.lowStockThreshold !== undefined) {
        inventoryItem.lowStockThreshold = updateStockDto.lowStockThreshold;
      }
    }

    return await this.inventoryRepository.save(inventoryItem);
  }

  async checkAvailability(productId: string, quantity: number): Promise<boolean> {
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { product: { id: productId } },
    });

    if (!inventoryItem) {
      return false;
    }

    // Check available quantity (total - reserved)
    const reservedQuantity = await this.getReservedQuantity(productId);
    const availableQuantity = inventoryItem.quantity - reservedQuantity;

    return availableQuantity >= quantity;
  }

  async getLowStockItems(threshold?: number): Promise<LowStockAlertDto[]> {
    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.quantity <= COALESCE(:threshold, inventory.lowStockThreshold)', {
        threshold,
      });

    const lowStockItems = await queryBuilder.getMany();

    return lowStockItems.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      currentQuantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      warehouseLocation: item.warehouseLocation,
      supplierId: item.supplierId,
      lastUpdated: item.updatedAt,
    }));
  }

  async reserveStock(reservationDto: CreateStockReservationDto): Promise<StockReservationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if stock is available
      const isAvailable = await this.checkAvailability(reservationDto.productId, reservationDto.quantity);
      if (!isAvailable) {
        throw new BadRequestException('Insufficient stock available for reservation');
      }

      // Create reservation (expires in 30 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      const reservation = this.reservationRepository.create({
        productId: reservationDto.productId,
        quantity: reservationDto.quantity,
        reservationReference: reservationDto.reservationReference,
        expiresAt,
      });

      const savedReservation = await queryRunner.manager.save(reservation);
      await queryRunner.commitTransaction();

      return {
        id: savedReservation.id,
        productId: savedReservation.productId,
        quantity: savedReservation.quantity,
        reservationReference: savedReservation.reservationReference,
        expiresAt: savedReservation.expiresAt,
        createdAt: savedReservation.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const result = await this.reservationRepository.delete(reservationId);
    if (result.affected === 0) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }
  }

  async getInventoryByProductId(productId: string): Promise<InventoryItem | null> {
    return await this.inventoryRepository.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await this.inventoryRepository.find({
      relations: ['product'],
      order: { updatedAt: 'DESC' },
    });
  }

  async adjustStock(productId: string, adjustment: number, reason?: string): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item for product ${productId} not found`);
    }

    const newQuantity = inventoryItem.quantity + adjustment;
    if (newQuantity < 0) {
      throw new BadRequestException('Stock adjustment would result in negative quantity');
    }

    inventoryItem.quantity = newQuantity;
    return await this.inventoryRepository.save(inventoryItem);
  }

  private async getReservedQuantity(productId: string): Promise<number> {
    const result = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('SUM(reservation.quantity)', 'total')
      .where('reservation.productId = :productId', { productId })
      .andWhere('reservation.expiresAt > :now', { now: new Date() })
      .getRawOne();

    return parseInt(result.total) || 0;
  }

  async cleanupExpiredReservations(): Promise<void> {
    await this.reservationRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}