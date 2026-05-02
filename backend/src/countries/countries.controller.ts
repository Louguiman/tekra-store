import { Controller, Get, Param, Query, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';
import { CountryConfigDto, CountryDto } from './dto/country.dto';
import { ProductPrice } from '../entities/product-price.entity';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Public()
  @Get()
  async findAll(): Promise<Country[]> {
    return this.countriesService.findAll();
  }

  @Public()
  @Get('default')
  async findDefault(): Promise<Country | null> {
    return this.countriesService.findDefault();
  }

  @Public()
  @Get(':code')
  async findByCode(@Param('code') code: string): Promise<Country> {
    return this.countriesService.findByCode(code);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() countryDto: CountryDto): Promise<Country> {
    return this.countriesService.create(countryDto);
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('code') code: string, @Body() countryDto: CountryDto): Promise<Country> {
    return this.countriesService.update(code, countryDto);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('code') code: string): Promise<void> {
    return this.countriesService.delete(code);
  }

  @Patch(':code/default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setDefault(@Param('code') code: string): Promise<Country> {
    return this.countriesService.setDefault(code);
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