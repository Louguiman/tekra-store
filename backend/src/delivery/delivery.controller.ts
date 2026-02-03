import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../entities/user.entity';
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

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // Public endpoints for customers
  @Public()
  @Get('methods/:countryCode')
  async getDeliveryMethodsByCountry(
    @Param('countryCode') countryCode: string,
  ): Promise<DeliveryMethodDto[]> {
    return this.deliveryService.getDeliveryMethodsByCountry(countryCode);
  }

  @Public()
  @Get('pickup-points/:countryCode')
  async getPickupPointsByCountry(
    @Param('countryCode') countryCode: string,
  ): Promise<PickupPointDto[]> {
    return this.deliveryService.getPickupPointsByCountry(countryCode);
  }

  @Public()
  @Post('calculate-fee')
  async calculateDeliveryFee(
    @Body() calculateDto: CalculateDeliveryFeeDto,
  ): Promise<DeliveryFeeResultDto> {
    return this.deliveryService.calculateDeliveryFee(calculateDto);
  }

  @Public()
  @Get('tracking/:trackingNumber')
  async getDeliveryTracking(
    @Param('trackingNumber') trackingNumber: string,
  ): Promise<DeliveryTrackingDto> {
    return this.deliveryService.getDeliveryTracking(trackingNumber);
  }

  @Public()
  @Get('tracking/order/:orderId')
  async getDeliveryTrackingByOrder(
    @Param('orderId') orderId: string,
  ): Promise<DeliveryTrackingDto[]> {
    return this.deliveryService.getDeliveryTrackingByOrder(orderId);
  }

  // Admin endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('methods')
  async createDeliveryMethod(
    @Body() createDto: CreateDeliveryMethodDto,
  ): Promise<DeliveryMethodDto> {
    return this.deliveryService.createDeliveryMethod(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Put('methods/:id')
  async updateDeliveryMethod(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryMethodDto,
  ): Promise<DeliveryMethodDto> {
    return this.deliveryService.updateDeliveryMethod(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('pickup-points')
  async createPickupPoint(
    @Body() createDto: CreatePickupPointDto,
  ): Promise<PickupPointDto> {
    return this.deliveryService.createPickupPoint(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Put('pickup-points/:id')
  async updatePickupPoint(
    @Param('id') id: string,
    @Body() updateDto: UpdatePickupPointDto,
  ): Promise<PickupPointDto> {
    return this.deliveryService.updatePickupPoint(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('tracking')
  async createDeliveryTracking(
    @Body() createDto: CreateDeliveryTrackingDto,
  ): Promise<DeliveryTrackingDto> {
    return this.deliveryService.createDeliveryTracking(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Put('tracking/:trackingNumber')
  async updateDeliveryTracking(
    @Param('trackingNumber') trackingNumber: string,
    @Body() updateDto: UpdateDeliveryTrackingDto,
  ): Promise<DeliveryTrackingDto> {
    return this.deliveryService.updateDeliveryTracking(trackingNumber, updateDto);
  }
}