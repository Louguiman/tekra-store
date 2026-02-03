import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'West Africa E-commerce Platform API is running!';
  }
}