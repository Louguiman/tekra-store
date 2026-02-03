import { Controller, Get, Param, Query } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';
import { CountryConfigDto } from './dto/country.dto';
import { ProductPrice } from '../entities/product-price.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Public()
  @Get()
  async findAll(): Promise<Country[]> {
    return this.countriesService.findAll();
  }

  @Public()
  @Get(':code')
  async findByCode(@Param('code') code: string): Promise<Country> {
    return this.countriesService.findByCode(code);
  }

  @Public()
  @Get(':code/config')
  async getCountryConfig(@Param('code') code: string): Promise<CountryConfigDto> {
    return this.countriesService.getCountryConfig(code);
  }

  @Public()
  @Get(':code/prices')
  async getProductPrices(
    @Param('code') code: string,
    @Query('productIds') productIds?: string,
  ): Promise<ProductPrice[]> {
    const productIdArray = productIds ? productIds.split(',') : undefined;
    return this.countriesService.getProductPricesForCountry(code, productIdArray);
  }

  @Public()
  @Get(':code/format-currency/:amount')
  async formatCurrency(
    @Param('code') code: string,
    @Param('amount') amount: string,
  ): Promise<{ formatted: string }> {
    const numericAmount = parseFloat(amount);
    const formatted = this.countriesService.formatCurrency(numericAmount, code);
    return { formatted };
  }
}