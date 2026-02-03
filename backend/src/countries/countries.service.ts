import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../entities/country.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { CountryDto, CountryConfigDto, DeliveryMethodDto, PaymentProviderDto } from './dto/country.dto';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(ProductPrice)
    private readonly productPriceRepository: Repository<ProductPrice>,
  ) {}

  async findAll(): Promise<Country[]> {
    return this.countryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<Country> {
    const country = await this.countryRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!country) {
      throw new NotFoundException(`Country with code ${code} not found`);
    }

    return country;
  }

  async getCountryConfig(code: string): Promise<CountryConfigDto> {
    const country = await this.findByCode(code);
    
    return {
      code: country.code,
      deliveryMethods: this.getDeliveryMethodsForCountry(country.code),
      paymentProviders: this.getPaymentProvidersForCountry(country.code),
    };
  }

  async getProductPricesForCountry(countryCode: string, productIds?: string[]): Promise<ProductPrice[]> {
    const country = await this.findByCode(countryCode);
    
    const query = this.productPriceRepository
      .createQueryBuilder('price')
      .leftJoinAndSelect('price.product', 'product')
      .leftJoinAndSelect('price.country', 'country')
      .where('country.id = :countryId', { countryId: country.id });

    if (productIds && productIds.length > 0) {
      query.andWhere('product.id IN (:...productIds)', { productIds });
    }

    return query.getMany();
  }

  formatCurrency(amount: number, countryCode: string): string {
    // All supported countries use FCFA
    return this.formatFCFA(amount);
  }

  private formatFCFA(amount: number): string {
    // Format FCFA with proper thousand separators
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    
    return `${formatted} FCFA`;
  }

  private getDeliveryMethodsForCountry(countryCode: string): DeliveryMethodDto[] {
    switch (countryCode) {
      case 'ML': // Mali - Own delivery team
        return [
          {
            id: 'mali-bamako-delivery',
            name: 'Livraison Bamako',
            type: 'own_delivery',
            baseFee: 2000,
            feePerKm: 100,
            estimatedDays: 1,
            description: 'Livraison dans Bamako par notre équipe',
          },
          {
            id: 'mali-regions-delivery',
            name: 'Livraison Régions',
            type: 'own_delivery',
            baseFee: 5000,
            estimatedDays: 3,
            description: 'Livraison dans les régions du Mali',
          },
        ];
      
      case 'CI': // Côte d'Ivoire - Partner logistics
        return [
          {
            id: 'ci-abidjan-pickup',
            name: 'Point de Retrait Abidjan',
            type: 'partner_logistics',
            baseFee: 1500,
            estimatedDays: 2,
            description: 'Retrait dans nos points partenaires à Abidjan',
          },
          {
            id: 'ci-regions-pickup',
            name: 'Points de Retrait Régions',
            type: 'partner_logistics',
            baseFee: 3000,
            estimatedDays: 4,
            description: 'Retrait dans nos points partenaires en région',
          },
        ];
      
      case 'BF': // Burkina Faso - Partner logistics
        return [
          {
            id: 'bf-ouaga-pickup',
            name: 'Point de Retrait Ouagadougou',
            type: 'partner_logistics',
            baseFee: 2000,
            estimatedDays: 3,
            description: 'Retrait dans nos points partenaires à Ouagadougou',
          },
          {
            id: 'bf-regions-pickup',
            name: 'Points de Retrait Régions',
            type: 'partner_logistics',
            baseFee: 4000,
            estimatedDays: 5,
            description: 'Retrait dans nos points partenaires en région',
          },
        ];
      
      default:
        return [];
    }
  }

  private getPaymentProvidersForCountry(countryCode: string): PaymentProviderDto[] {
    const commonProviders: PaymentProviderDto[] = [
      {
        id: 'orange-money',
        name: 'Orange Money',
        type: 'mobile_money',
        provider: 'orange',
        isActive: true,
        processingFee: 0,
      },
      {
        id: 'wave',
        name: 'Wave',
        type: 'mobile_money',
        provider: 'wave',
        isActive: true,
        processingFee: 0,
      },
      {
        id: 'visa',
        name: 'Visa',
        type: 'card',
        provider: 'visa',
        isActive: true,
        processingFee: 2.5, // 2.5% processing fee
      },
      {
        id: 'mastercard',
        name: 'MasterCard',
        type: 'card',
        provider: 'mastercard',
        isActive: true,
        processingFee: 2.5, // 2.5% processing fee
      },
    ];

    // Add Moov for Mali and Burkina Faso
    if (countryCode === 'ML' || countryCode === 'BF') {
      commonProviders.splice(2, 0, {
        id: 'moov',
        name: 'Moov Money',
        type: 'mobile_money',
        provider: 'moov',
        isActive: true,
        processingFee: 0,
      });
    }

    return commonProviders;
  }
}