import 'reflect-metadata';

/**
 * Migration Validation Script
 * 
 * This script validates that all migration files are syntactically correct
 * and can be imported without errors.
 */

async function validateMigrations() {
  console.log('Validating migration files...');

  try {
    // Import all migration files to check for syntax errors
    const { InitialSchema1704312000000 } = await import('./migrations/1704312000000-InitialSchema');
    const { SeedCountries1704312001000 } = await import('./migrations/1704312001000-SeedCountries');
    const { SeedCategories1704312002000 } = await import('./migrations/1704312002000-SeedCategories');
    const { SeedProductSegments1704312003000 } = await import('./migrations/1704312003000-SeedProductSegments');
    const { SeedRoles1704312004000 } = await import('./migrations/1704312004000-SeedRoles');

    // Validate that migrations have required methods
    const migrations = [
      { name: 'InitialSchema', class: InitialSchema1704312000000 },
      { name: 'SeedCountries', class: SeedCountries1704312001000 },
      { name: 'SeedCategories', class: SeedCategories1704312002000 },
      { name: 'SeedProductSegments', class: SeedProductSegments1704312003000 },
      { name: 'SeedRoles', class: SeedRoles1704312004000 },
    ];

    for (const migration of migrations) {
      const instance = new migration.class();
      
      if (typeof instance.up !== 'function') {
        throw new Error(`Migration ${migration.name} is missing 'up' method`);
      }
      
      if (typeof instance.down !== 'function') {
        throw new Error(`Migration ${migration.name} is missing 'down' method`);
      }
      
      if (!instance.name || typeof instance.name !== 'string') {
        throw new Error(`Migration ${migration.name} is missing or has invalid 'name' property`);
      }
      
      console.log(`✓ Migration ${migration.name} is valid`);
    }

    console.log('✓ All migration files are valid!');
    return true;
  } catch (error) {
    console.error('✗ Migration validation failed:', error.message);
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateMigrations()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { validateMigrations };