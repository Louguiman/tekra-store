import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryMethod, DeliveryType } from '../entities/delivery-method.entity';
import { PickupPoint } from '../entities/pickup-point.entity';
import { DeliveryTracking, DeliveryStatus } from '../entities/delivery-tracking.entity';
import { Country } from '../entities/country.entity';
import { Order } from '../entities/order.entity';
import {
  CreateDeliveryMethodDto,
  UpdateDeliveryMethodDto,
  DeliveryMethodDto,
} from './dto/delivery-method.dto';
import {
  CreatePickupPointDto,
  UpdatePickupPointDto,
  PickupPointDto,
} from './dto/pickup-point.dto';
import {
  CreateDeliveryTrackingDto,
  UpdateDeliveryTrackingDto,
  DeliveryTrackingDto,
} from './dto/delivery-tracking.dto';
import {
  CalculateDeliveryFeeDto,
  DeliveryFeeResultDto,
} from './dto/delivery-fee-calculation.dto';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryMethod)
    private deliveryMethodRepository: Repository<DeliveryMethod>,
    @InjectRepository(PickupPoint)
    private pickupPointRepository: Repository<PickupPoint>,
    @InjectRepository(DeliveryTracking)
    private deliveryTrackingRepository: Repository<DeliveryTracking>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  // Delivery Methods Management
  async createDeliveryMethod(
    createDto: CreateDeliveryMethodDto,
  ): Promise<DeliveryMethodDto> {
    const country = await this.countryRepository.findOne({
      where: { id: createDto.countryId },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    const deliveryMethod = this.deliveryMethodRepository.create({
      ...createDto,
      country,
    });

    const saved = await this.deliveryMethodRepository.save(deliveryMethod);
    return this.mapToDeliveryMethodDto(saved);
  }

  async getDeliveryMethodsByCountry(countryCode: string): Promise<DeliveryMethodDto[]> {
    const deliveryMethods = await this.deliveryMethodRepository.find({
      where: { 
        country: { code: countryCode },
        isActive: true,
      },
      relations: ['country'],
    });

    return deliveryMethods.map(method => this.mapToDeliveryMethodDto(method));
  }

  async updateDeliveryMethod(
    id: string,
    updateDto: UpdateDeliveryMethodDto,
  ): Promise<DeliveryMethodDto> {
    const deliveryMethod = await this.deliveryMethodRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!deliveryMethod) {
      throw new NotFoundException('Delivery method not found');
    }

    Object.assign(deliveryMethod, updateDto);
    const saved = await this.deliveryMethodRepository.save(deliveryMethod);
    return this.mapToDeliveryMethodDto(saved);
  }

  // Pickup Points Management
  async createPickupPoint(createDto: CreatePickupPointDto): Promise<PickupPointDto> {
    const country = await this.countryRepository.findOne({
      where: { id: createDto.countryId },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    const pickupPoint = this.pickupPointRepository.create({
      ...createDto,
      country,
    });

    const saved = await this.pickupPointRepository.save(pickupPoint);
    return this.mapToPickupPointDto(saved);
  }

  async getPickupPointsByCountry(countryCode: string): Promise<PickupPointDto[]> {
    const pickupPoints = await this.pickupPointRepository.find({
      where: { 
        country: { code: countryCode },
        isActive: true,
      },
      relations: ['country'],
    });

    return pickupPoints.map(point => this.mapToPickupPointDto(point));
  }

  async updatePickupPoint(
    id: string,
    updateDto: UpdatePickupPointDto,
  ): Promise<PickupPointDto> {
    const pickupPoint = await this.pickupPointRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!pickupPoint) {
      throw new NotFoundException('Pickup point not found');
    }

    Object.assign(pickupPoint, updateDto);
    const saved = await this.pickupPointRepository.save(pickupPoint);
    return this.mapToPickupPointDto(saved);
  }

  // Delivery Fee Calculation
  async calculateDeliveryFee(
    calculateDto: CalculateDeliveryFeeDto,
  ): Promise<DeliveryFeeResultDto> {
    const deliveryMethod = await this.deliveryMethodRepository.findOne({
      where: { 
        id: calculateDto.deliveryMethodId,
        country: { code: calculateDto.countryCode },
        isActive: true,
      },
      relations: ['country'],
    });

    if (!deliveryMethod) {
      throw new NotFoundException('Delivery method not found');
    }

    let deliveryFee = deliveryMethod.baseFee;

    // Apply country-specific logic
    if (calculateDto.countryCode === 'ML') {
      // Mali: Own delivery team with city-based fees
      deliveryFee = this.calculateMaliDeliveryFee(
        deliveryMethod.baseFee,
        calculateDto.city,
        calculateDto.orderValue,
      );
    } else if (['CI', 'BF'].includes(calculateDto.countryCode)) {
      // Côte d'Ivoire and Burkina Faso: Partner logistics
      deliveryFee = this.calculatePartnerLogisticsFee(
        deliveryMethod.baseFee,
        calculateDto.orderValue,
      );
    }

    return {
      deliveryFee,
      estimatedDaysMin: deliveryMethod.estimatedDaysMin,
      estimatedDaysMax: deliveryMethod.estimatedDaysMax,
      deliveryMethodName: deliveryMethod.name,
      freeDeliveryThreshold: this.getFreeDeliveryThreshold(calculateDto.countryCode),
    };
  }

  // Delivery Tracking
  async createDeliveryTracking(
    createDto: CreateDeliveryTrackingDto,
  ): Promise<DeliveryTrackingDto> {
    const order = await this.orderRepository.findOne({
      where: { id: createDto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const tracking = this.deliveryTrackingRepository.create({
      ...createDto,
      order,
      estimatedDeliveryDate: createDto.estimatedDeliveryDate 
        ? new Date(createDto.estimatedDeliveryDate) 
        : null,
    });

    const saved = await this.deliveryTrackingRepository.save(tracking);
    return this.mapToDeliveryTrackingDto(saved);
  }

  async updateDeliveryTracking(
    trackingNumber: string,
    updateDto: UpdateDeliveryTrackingDto,
  ): Promise<DeliveryTrackingDto> {
    const tracking = await this.deliveryTrackingRepository.findOne({
      where: { trackingNumber },
      relations: ['order'],
    });

    if (!tracking) {
      throw new NotFoundException('Delivery tracking not found');
    }

    if (updateDto.estimatedDeliveryDate) {
      updateDto.estimatedDeliveryDate = new Date(updateDto.estimatedDeliveryDate) as any;
    }

    if (updateDto.actualDeliveryDate) {
      updateDto.actualDeliveryDate = new Date(updateDto.actualDeliveryDate) as any;
    }

    Object.assign(tracking, updateDto);
    const saved = await this.deliveryTrackingRepository.save(tracking);
    return this.mapToDeliveryTrackingDto(saved);
  }

  async getDeliveryTracking(trackingNumber: string): Promise<DeliveryTrackingDto> {
    const tracking = await this.deliveryTrackingRepository.findOne({
      where: { trackingNumber },
      relations: ['order'],
    });

    if (!tracking) {
      throw new NotFoundException('Delivery tracking not found');
    }

    return this.mapToDeliveryTrackingDto(tracking);
  }

  async getDeliveryTrackingByOrder(orderId: string): Promise<DeliveryTrackingDto[]> {
    const trackings = await this.deliveryTrackingRepository.find({
      where: { order: { id: orderId } },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });

    return trackings.map(tracking => this.mapToDeliveryTrackingDto(tracking));
  }

  // Private helper methods
  private calculateMaliDeliveryFee(
    baseFee: number,
    city: string,
    orderValue?: number,
  ): number {
    let fee = baseFee;

    // City-based fee adjustments for Mali
    const cityMultipliers: Record<string, number> = {
      'Bamako': 1.0,
      'Sikasso': 1.2,
      'Mopti': 1.5,
      'Ségou': 1.3,
      'Kayes': 1.4,
      'Koutiala': 1.3,
      'Gao': 1.8,
      'Tombouctou': 2.0,
    };

    const multiplier = cityMultipliers[city] || 1.5; // Default for other cities
    fee = baseFee * multiplier;

    // Free delivery for orders above 100,000 FCFA in Bamako
    if (city === 'Bamako' && orderValue && orderValue >= 100000) {
      fee = 0;
    }

    return Math.round(fee);
  }

  private calculatePartnerLogisticsFee(
    baseFee: number,
    orderValue?: number,
  ): number {
    let fee = baseFee;

    // Free delivery for orders above 75,000 FCFA for partner logistics
    if (orderValue && orderValue >= 75000) {
      fee = 0;
    }

    return fee;
  }

  private getFreeDeliveryThreshold(countryCode: string): number {
    const thresholds: Record<string, number> = {
      'ML': 100000, // 100,000 FCFA for Mali (Bamako only)
      'CI': 75000,  // 75,000 FCFA for Côte d'Ivoire
      'BF': 75000,  // 75,000 FCFA for Burkina Faso
    };

    return thresholds[countryCode] || 100000;
  }

  // Mapping methods
  private mapToDeliveryMethodDto(method: DeliveryMethod): DeliveryMethodDto {
    return {
      id: method.id,
      name: method.name,
      type: method.type,
      baseFee: method.baseFee,
      estimatedDaysMin: method.estimatedDaysMin,
      estimatedDaysMax: method.estimatedDaysMax,
      description: method.description,
      isActive: method.isActive,
      countryCode: method.country.code,
    };
  }

  private mapToPickupPointDto(point: PickupPoint): PickupPointDto {
    return {
      id: point.id,
      name: point.name,
      address: point.address,
      city: point.city,
      phone: point.phone,
      instructions: point.instructions,
      isActive: point.isActive,
      countryCode: point.country.code,
    };
  }

  private mapToDeliveryTrackingDto(tracking: DeliveryTracking): DeliveryTrackingDto {
    return {
      id: tracking.id,
      trackingNumber: tracking.trackingNumber,
      status: tracking.status,
      estimatedDeliveryDate: tracking.estimatedDeliveryDate,
      actualDeliveryDate: tracking.actualDeliveryDate,
      deliveryNotes: tracking.deliveryNotes,
      carrierName: tracking.carrierName,
      orderId: tracking.order.id,
      createdAt: tracking.createdAt,
      updatedAt: tracking.updatedAt,
    };
  }
}