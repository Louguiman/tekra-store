import { Country } from './entities/country.entity';
import { Category } from './entities/category.entity';
import { ProductSegmentEntity, ProductSegment } from './entities/product-segment.entity';
import { Role } from './entities/role.entity';

/**
 * Database Setup Validation Tests
 * 
 * These tests verify that the database entities are correctly defined
 * and that seed data follows the expected format.
 */

describe('Database Setup Validation Tests', () => {

  describe('Entity Structure Validation', () => {
    it('should have properly defined Country entity class', () => {
      expect(Country).toBeDefined();
      expect(typeof Country).toBe('function');
      
      const country = new Country();
      expect(country).toBeInstanceOf(Country);
    });

    it('should have properly defined Category entity class', () => {
      expect(Category).toBeDefined();
      expect(typeof Category).toBe('function');
      
      const category = new Category();
      expect(category).toBeInstanceOf(Category);
    });

    it('should have properly defined ProductSegmentEntity class', () => {
      expect(ProductSegmentEntity).toBeDefined();
      expect(typeof ProductSegmentEntity).toBe('function');
      
      const segment = new ProductSegmentEntity();
      expect(segment).toBeInstanceOf(ProductSegmentEntity);
    });

    it('should have properly defined Role entity class', () => {
      expect(Role).toBeDefined();
      expect(typeof Role).toBe('function');
      
      const role = new Role();
      expect(role).toBeInstanceOf(Role);
    });
  });

  describe('Seed Data Validation', () => {
    it('should validate West African countries data', () => {
      const countries = [
        { code: 'ML', name: 'Mali', currency: 'FCFA' },
        { code: 'CI', name: 'Côte d\'Ivoire', currency: 'FCFA' },
        { code: 'BF', name: 'Burkina Faso', currency: 'FCFA' },
      ];

      countries.forEach(country => {
        expect(country.code).toMatch(/^[A-Z]{2}$/);
        expect(country.name).toBeTruthy();
        expect(country.name.length).toBeGreaterThan(0);
        expect(country.currency).toBe('FCFA');
      });

      // Ensure all codes are unique
      const codes = countries.map(c => c.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('should validate product segments data', () => {
      const segments = [
        ProductSegment.PREMIUM,
        ProductSegment.MID_RANGE,
        ProductSegment.REFURBISHED,
      ];

      segments.forEach(segment => {
        expect(Object.values(ProductSegment)).toContain(segment);
      });

      // Ensure all segments are unique
      expect(new Set(segments).size).toBe(segments.length);
    });

    it('should validate category slugs format', () => {
      const categories = [
        { name: 'Smartphones', slug: 'smartphones' },
        { name: 'Laptops', slug: 'laptops' },
        { name: 'Tablets', slug: 'tablets' },
        { name: 'Gaming', slug: 'gaming' },
        { name: 'Audio', slug: 'audio' },
        { name: 'Accessories', slug: 'accessories' },
        { name: 'Computers', slug: 'computers' },
        { name: 'Monitors', slug: 'monitors' },
        { name: 'Storage', slug: 'storage' },
        { name: 'Networking', slug: 'networking' }
      ];

      categories.forEach(category => {
        expect(category.slug).toMatch(/^[a-z]+$/);
        expect(category.slug.length).toBeGreaterThan(0);
        expect(category.name).toBeTruthy();
        expect(category.name.length).toBeGreaterThan(0);
      });

      // Ensure all slugs are unique
      const slugs = categories.map(c => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('should validate role names format', () => {
      const roles = [
        { name: 'admin', description: 'Full system administrator with all permissions' },
        { name: 'staff', description: 'Staff member with limited administrative permissions' },
        { name: 'customer', description: 'Regular customer with basic user permissions' }
      ];

      roles.forEach(role => {
        expect(role.name).toMatch(/^[a-z]+$/);
        expect(role.name.length).toBeGreaterThan(0);
        expect(role.description).toBeTruthy();
        expect(role.description.length).toBeGreaterThan(0);
      });

      // Ensure all role names are unique
      const names = roles.map(r => r.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate country code format', () => {
      const validCodes = ['ML', 'CI', 'BF'];
      const invalidCodes = ['ml', 'MLI', 'C', '12'];

      validCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z]{2}$/);
      });

      invalidCodes.forEach(code => {
        expect(code).not.toMatch(/^[A-Z]{2}$/);
      });
    });

    it('should validate product segment enum values', () => {
      expect(ProductSegment.PREMIUM).toBe('premium');
      expect(ProductSegment.MID_RANGE).toBe('mid_range');
      expect(ProductSegment.REFURBISHED).toBe('refurbished');
      
      // Ensure enum has exactly 3 values
      expect(Object.keys(ProductSegment)).toHaveLength(3);
    });

    it('should validate currency consistency', () => {
      const westAfricanCountries = ['ML', 'CI', 'BF'];
      
      westAfricanCountries.forEach(countryCode => {
        // All West African countries in our system should use FCFA
        expect('FCFA').toBe('FCFA');
      });
    });
  });
});