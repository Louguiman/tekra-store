import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Session,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Session() session: any) {
    return this.cartService.getCart(session);
  }

  @Post('items')
  addToCart(@Body() addToCartDto: AddToCartDto, @Session() session: any) {
    return this.cartService.addToCart(session, addToCartDto);
  }

  @Patch('items/:productId')
  updateCartItem(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Session() session: any,
  ) {
    return this.cartService.updateCartItem(session, productId, updateCartItemDto);
  }

  @Delete('items/:productId')
  removeFromCart(@Param('productId') productId: string, @Session() session: any) {
    return this.cartService.removeFromCart(session, productId);
  }

  @Delete()
  clearCart(@Session() session: any) {
    return this.cartService.clearCart(session);
  }
}