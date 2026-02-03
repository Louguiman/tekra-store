import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart-item.dto';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string }>;
  };
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getCart(session: any): Promise<Cart> {
    const cartItems = session.cart || [];
    const items: CartItem[] = [];
    let totalAmount = 0;
    let totalItems = 0;

    for (const item of cartItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
        relations: ['images'],
      });

      if (product) {
        const cartItem: CartItem = {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            images: product.images.map(img => ({ url: img.url })),
          },
        };

        items.push(cartItem);
        totalAmount += item.unitPrice * item.quantity;
        totalItems += item.quantity;
      }
    }

    return {
      items,
      totalAmount,
      totalItems,
    };
  }

  async addToCart(session: any, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity } = addToCartDto;

    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['prices'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // For now, use the first available price (in a real app, this would be based on selected country)
    const unitPrice = product.prices[0]?.promoPrice || product.prices[0]?.price;
    if (!unitPrice) {
      throw new BadRequestException('Product price not available');
    }

    // Initialize cart if it doesn't exist
    if (!session.cart) {
      session.cart = [];
    }

    // Check if item already exists in cart
    const existingItemIndex = session.cart.findIndex((item: any) => item.productId === productId);

    if (existingItemIndex >= 0) {
      // Update quantity
      session.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      session.cart.push({
        productId,
        quantity,
        unitPrice,
      });
    }

    return this.getCart(session);
  }

  async updateCartItem(session: any, productId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
    const { quantity } = updateCartItemDto;

    if (!session.cart) {
      session.cart = [];
    }

    const itemIndex = session.cart.findIndex((item: any) => item.productId === productId);

    if (itemIndex >= 0) {
      if (quantity === 0) {
        // Remove item if quantity is 0
        session.cart.splice(itemIndex, 1);
      } else {
        // Update quantity
        session.cart[itemIndex].quantity = quantity;
      }
    } else {
      throw new NotFoundException('Item not found in cart');
    }

    return this.getCart(session);
  }

  async removeFromCart(session: any, productId: string): Promise<Cart> {
    if (!session.cart) {
      session.cart = [];
    }

    session.cart = session.cart.filter((item: any) => item.productId !== productId);

    return this.getCart(session);
  }

  async clearCart(session: any): Promise<Cart> {
    session.cart = [];
    return this.getCart(session);
  }
}