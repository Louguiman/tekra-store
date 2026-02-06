import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseSeeder } from './database.seeder';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Only run seeder in development or if explicitly enabled
    const shouldSeed = process.env.AUTO_SEED === 'true' || process.env.NODE_ENV === 'development';
    
    if (shouldSeed) {
      this.logger.log('🌱 Starting automatic database seeding...');
      this.logger.log(`Environment: ${process.env.NODE_ENV}`);
      this.logger.log(`AUTO_SEED: ${process.env.AUTO_SEED}`);
      this.logger.log(`DEFAULT_ADMIN_PASSWORD: ${process.env.DEFAULT_ADMIN_PASSWORD ? '***SET***' : 'Using default'}`);
      
      try {
        const seeder = new DatabaseSeeder(this.dataSource);
        await seeder.run();
        this.logger.log('✅ Database seeding completed successfully!');
        this.logger.log('📧 Admin login: admin@ecommerce.local');
        this.logger.log('📱 Admin phone: +223 70 00 00 00');
        this.logger.log(`🔑 Admin password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!'}`);
      } catch (error) {
        this.logger.error('❌ Error during database seeding:', error.message);
        this.logger.error(error.stack);
        // Don't throw error - allow app to start even if seeding fails
      }
    } else {
      this.logger.log('⏭️  Auto-seeding disabled. Set AUTO_SEED=true to enable.');
    }
  }
}
