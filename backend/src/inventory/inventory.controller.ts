import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateStockReservationDto } from './dto/stock-reservation.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAllInventory() {
    return await this.inventoryService.getAllInventoryItems();
  }

  @Get('product/:productId')
  async getInventoryByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return await this.inventoryService.getInventoryByProductId(productId);
  }

  @Get('low-stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getLowStockItems(@Query('threshold', new ParseIntPipe({ optional: true })) threshold?: number) {
    return await this.inventoryService.getLowStockItems(threshold);
  }

  @Get('availability/:productId')
  async checkAvailability(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    const isAvailable = await this.inventoryService.checkAvailability(productId, quantity);
    return { productId, quantity, available: isAvailable };
  }

  @Put('product/:productId/stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async updateStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return await this.inventoryService.updateStock(productId, updateStockDto);
  }

  @Post('product/:productId/adjust')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async adjustStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: { adjustment: number; reason?: string },
  ) {
    return await this.inventoryService.adjustStock(productId, body.adjustment, body.reason);
  }

  @Post('reservations')
  async createReservation(@Body() reservationDto: CreateStockReservationDto) {
    return await this.inventoryService.reserveStock(reservationDto);
  }

  @Delete('reservations/:reservationId')
  async releaseReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string) {
    await this.inventoryService.releaseReservation(reservationId);
    return { message: 'Reservation released successfully' };
  }

  @Post('cleanup-reservations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async cleanupExpiredReservations() {
    await this.inventoryService.cleanupExpiredReservations();
    return { message: 'Expired reservations cleaned up successfully' };
  }
}