import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Country } from '../entities/country.entity';
import { Category } from '../entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from '../entities/product-segment.entity';
import { Role } from '../entities/role.entity';
import { User, UserRole } from '../entities/user.entity';
import { DeliveryMethod, DeliveryType } from '../entities/delivery-method.entity';
import { PickupPoint } from '../entities/pickup-point.entity';

export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('Starting database seeding...');

    await this.seedCountries();
    await this.seedCategories();
    await this.seedProductSegments();
    await this.seedRoles();
    await this.seedDefaultAdminUser();
    await this.seedDeliveryMethods();
    await this.seedPickupPoints();

    console.log('Database seeding completed successfully!');
  }

  private async seedCountries(): Promise<void> {
    console.log('Seeding countries...');
    
    const countryRepository = this.dataSource.getRepository(Country);
    
    const countries = [
      { code: 'ML', name: 'Mali', currency: 'FCFA' },
      { code: 'CI', name: 'Côte d\'Ivoire', currency: 'FCFA' },
      { code: 'BF', name: 'Burkina Faso', currency: 'FCFA' },
    ];

    for (const countryData of countries) {
      const existingCountry = await countryRepository.findOne({
        where: { code: countryData.code },
      });

      if (!existingCountry) {
        const country = countryRepository.create(countryData);
        await countryRepository.save(country);
        console.log(`Created country: ${countryData.name} (${countryData.code})`);
      } else {
        console.log(`Country already exists: ${countryData.name} (${countryData.code})`);
      }
    }
  }

  private async seedCategories(): Promise<void> {
    console.log('Seeding categories...');
    
    const categoryRepository = this.dataSource.getRepository(Category);
    
    const categories = [
      { name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones and accessories' },
      { name: 'Laptops', slug: 'laptops', description: 'Portable computers and laptops' },
      { name: 'Tablets', slug: 'tablets', description: 'Tablet computers and e-readers' },
      { name: 'Gaming', slug: 'gaming', description: 'Gaming consoles, accessories, and peripherals' },
      { name: 'Audio', slug: 'audio', description: 'Headphones, speakers, and audio equipment' },
      { name: 'Accessories', slug: 'accessories', description: 'Phone cases, chargers, and other accessories' },
      { name: 'Computers', slug: 'computers', description: 'Desktop computers and components' },
      { name: 'Monitors', slug: 'monitors', description: 'Computer monitors and displays' },
      { name: 'Storage', slug: 'storage', description: 'Hard drives, SSDs, and storage devices' },
      { name: 'Networking', slug: 'networking', description: 'Routers, modems, and networking equipment' },
    ];

    for (const categoryData of categories) {
      const existingCategory = await categoryRepository.findOne({
        where: { slug: categoryData.slug },
      });

      if (!existingCategory) {
        const category = categoryRepository.create(categoryData);
        await categoryRepository.save(category);
        console.log(`Created category: ${categoryData.name}`);
      } else {
        console.log(`Category already exists: ${categoryData.name}`);
      }
    }
  }

  private async seedProductSegments(): Promise<void> {
    console.log('Seeding product segments...');
    
    const segmentRepository = this.dataSource.getRepository(ProductSegmentEntity);
    
    const segments = [
      { name: ProductSegment.PREMIUM, description: 'High-end premium products and gaming equipment' },
      { name: ProductSegment.MID_RANGE, description: 'Mid-range products offering good value for money' },
      { name: ProductSegment.REFURBISHED, description: 'Refurbished products with quality grades A, B, or C' },
    ];

    for (const segmentData of segments) {
      const existingSegment = await segmentRepository.findOne({
        where: { name: segmentData.name },
      });

      if (!existingSegment) {
        const segment = segmentRepository.create(segmentData);
        await segmentRepository.save(segment);
        console.log(`Created product segment: ${segmentData.name}`);
      } else {
        console.log(`Product segment already exists: ${segmentData.name}`);
      }
    }
  }

  private async seedRoles(): Promise<void> {
    console.log('Seeding roles...');
    
    const roleRepository = this.dataSource.getRepository(Role);
    
    const roles = [
      { name: 'admin', description: 'Full system administrator with all permissions' },
      { name: 'staff', description: 'Staff member with limited administrative permissions' },
      { name: 'customer', description: 'Regular customer with basic user permissions' },
    ];

    for (const roleData of roles) {
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }
  }

  private async seedDefaultAdminUser(): Promise<void> {
    console.log('Seeding default admin user...');
    
    const userRepository = this.dataSource.getRepository(User);
    
    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@ecommerce.local' },
    });

    if (!existingAdmin) {
      // Hash the default password
      const saltRounds = 12;
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      // Create default admin user
      const adminUser = userRepository.create({
        fullName: 'System Administrator',
        email: 'admin@ecommerce.local',
        phone: '+223 70 00 00 00',
        passwordHash,
        role: UserRole.ADMIN,
        countryCode: 'ML',
      });

      await userRepository.save(adminUser);
      console.log('Created default admin user:');
      console.log('  Email: admin@ecommerce.local');
      console.log('  Phone: +223 70 00 00 00');
      console.log(`  Password: ${defaultPassword}`);
      console.log('  ⚠️  IMPORTANT: Change the default password after first login!');
    } else {
      console.log('Default admin user already exists: admin@ecommerce.local');
    }

    // Also create a staff user for testing
    const existingStaff = await userRepository.findOne({
      where: { email: 'staff@ecommerce.local' },
    });

    if (!existingStaff) {
      const saltRounds = 12;
      const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || 'Staff123!';
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      const staffUser = userRepository.create({
        fullName: 'Staff Member',
        email: 'staff@ecommerce.local',
        phone: '+223 70 00 00 01',
        passwordHash,
        role: UserRole.STAFF,
        countryCode: 'ML',
      });

      await userRepository.save(staffUser);
      console.log('Created default staff user:');
      console.log('  Email: staff@ecommerce.local');
      console.log('  Phone: +223 70 00 00 01');
      console.log(`  Password: ${defaultPassword}`);
      console.log('  ⚠️  IMPORTANT: Change the default password after first login!');
    } else {
      console.log('Default staff user already exists: staff@ecommerce.local');
    }
  }

  private async seedDeliveryMethods(): Promise<void> {
    console.log('Seeding delivery methods...');
    
    const deliveryMethodRepository = this.dataSource.getRepository(DeliveryMethod);
    const countryRepository = this.dataSource.getRepository(Country);
    
    // Get countries
    const mali = await countryRepository.findOne({ where: { code: 'ML' } });
    const coteDivoire = await countryRepository.findOne({ where: { code: 'CI' } });
    const burkinaFaso = await countryRepository.findOne({ where: { code: 'BF' } });

    const deliveryMethods = [
      // Mali - Own delivery team
      {
        name: 'Livraison Standard Bamako',
        type: DeliveryType.OWN_DELIVERY,
        baseFee: 2500,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        description: 'Livraison par notre équipe dans Bamako',
        country: mali,
      },
      {
        name: 'Livraison Express Bamako',
        type: DeliveryType.OWN_DELIVERY,
        baseFee: 5000,
        estimatedDaysMin: 1,
        estimatedDaysMax: 1,
        description: 'Livraison express le jour même à Bamako',
        country: mali,
      },
      {
        name: 'Livraison Régions Mali',
        type: DeliveryType.OWN_DELIVERY,
        baseFee: 7500,
        estimatedDaysMin: 2,
        estimatedDaysMax: 5,
        description: 'Livraison dans les autres villes du Mali',
        country: mali,
      },
      // Côte d'Ivoire - Partner logistics
      {
        name: 'Point Relais Abidjan',
        type: DeliveryType.PARTNER_LOGISTICS,
        baseFee: 3000,
        estimatedDaysMin: 2,
        estimatedDaysMax: 4,
        description: 'Retrait en point relais à Abidjan',
        country: coteDivoire,
      },
      {
        name: 'Point Relais Autres Villes CI',
        type: DeliveryType.PARTNER_LOGISTICS,
        baseFee: 4000,
        estimatedDaysMin: 3,
        estimatedDaysMax: 6,
        description: 'Retrait en point relais dans les autres villes',
        country: coteDivoire,
      },
      // Burkina Faso - Partner logistics
      {
        name: 'Point Relais Ouagadougou',
        type: DeliveryType.PARTNER_LOGISTICS,
        baseFee: 3500,
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
        description: 'Retrait en point relais à Ouagadougou',
        country: burkinaFaso,
      },
      {
        name: 'Point Relais Autres Villes BF',
        type: DeliveryType.PARTNER_LOGISTICS,
        baseFee: 4500,
        estimatedDaysMin: 4,
        estimatedDaysMax: 7,
        description: 'Retrait en point relais dans les autres villes',
        country: burkinaFaso,
      },
    ];

    for (const methodData of deliveryMethods) {
      if (methodData.country) {
        const existingMethod = await deliveryMethodRepository.findOne({
          where: { 
            name: methodData.name,
            country: { id: methodData.country.id },
          },
        });

        if (!existingMethod) {
          const method = deliveryMethodRepository.create(methodData);
          await deliveryMethodRepository.save(method);
          console.log(`Created delivery method: ${methodData.name}`);
        } else {
          console.log(`Delivery method already exists: ${methodData.name}`);
        }
      }
    }
  }

  private async seedPickupPoints(): Promise<void> {
    console.log('Seeding pickup points...');
    
    const pickupPointRepository = this.dataSource.getRepository(PickupPoint);
    const countryRepository = this.dataSource.getRepository(Country);
    
    // Get countries
    const coteDivoire = await countryRepository.findOne({ where: { code: 'CI' } });
    const burkinaFaso = await countryRepository.findOne({ where: { code: 'BF' } });

    const pickupPoints = [
      // Côte d'Ivoire pickup points
      {
        name: 'Point Relais Plateau',
        address: 'Avenue Chardy, Plateau',
        city: 'Abidjan',
        phone: '+225 20 21 22 23',
        instructions: 'Ouvert du lundi au samedi de 8h à 18h',
        country: coteDivoire,
      },
      {
        name: 'Point Relais Cocody',
        address: 'Boulevard de la Paix, Cocody',
        city: 'Abidjan',
        phone: '+225 22 44 55 66',
        instructions: 'Ouvert du lundi au vendredi de 9h à 17h',
        country: coteDivoire,
      },
      {
        name: 'Point Relais Bouaké',
        address: 'Avenue Général de Gaulle',
        city: 'Bouaké',
        phone: '+225 31 63 44 55',
        instructions: 'Ouvert du mardi au samedi de 8h30 à 17h30',
        country: coteDivoire,
      },
      {
        name: 'Point Relais San Pedro',
        address: 'Rue du Commerce',
        city: 'San Pedro',
        phone: '+225 34 71 22 33',
        instructions: 'Ouvert du lundi au vendredi de 8h à 16h',
        country: coteDivoire,
      },
      // Burkina Faso pickup points
      {
        name: 'Point Relais Centre-Ville',
        address: 'Avenue Kwame Nkrumah',
        city: 'Ouagadougou',
        phone: '+226 25 30 40 50',
        instructions: 'Ouvert du lundi au samedi de 8h à 18h',
        country: burkinaFaso,
      },
      {
        name: 'Point Relais Zone du Bois',
        address: 'Secteur 4, Zone du Bois',
        city: 'Ouagadougou',
        phone: '+226 25 31 41 51',
        instructions: 'Ouvert du lundi au vendredi de 9h à 17h',
        country: burkinaFaso,
      },
      {
        name: 'Point Relais Bobo-Dioulasso',
        address: 'Avenue de la République',
        city: 'Bobo-Dioulasso',
        phone: '+226 20 97 11 22',
        instructions: 'Ouvert du mardi au samedi de 8h30 à 17h30',
        country: burkinaFaso,
      },
      {
        name: 'Point Relais Koudougou',
        address: 'Route de Ouagadougou',
        city: 'Koudougou',
        phone: '+226 25 44 55 66',
        instructions: 'Ouvert du lundi au vendredi de 8h à 16h',
        country: burkinaFaso,
      },
    ];

    for (const pointData of pickupPoints) {
      if (pointData.country) {
        const existingPoint = await pickupPointRepository.findOne({
          where: { 
            name: pointData.name,
            country: { id: pointData.country.id },
          },
        });

        if (!existingPoint) {
          const point = pickupPointRepository.create(pointData);
          await pickupPointRepository.save(point);
          console.log(`Created pickup point: ${pointData.name}`);
        } else {
          console.log(`Pickup point already exists: ${pointData.name}`);
        }
      }
    }
  }
}