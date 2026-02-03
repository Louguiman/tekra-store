import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';
import { ProductPrice } from '../entities/product-price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Country, ProductPrice])],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}