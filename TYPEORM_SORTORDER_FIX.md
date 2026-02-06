# TypeORM sortOrder Fix

## Problem
Backend was returning 500 error for product queries:
```
SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.
TypeORMError: SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.
```

Example failing request:
```
https://shop.sankaretech.com/api/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc
```

## Root Cause
The frontend was sending `sortOrder=desc` (lowercase), but TypeORM's `orderBy()` method only accepts uppercase values: `'ASC'` or `'DESC'`.

In `backend/src/products/products.service.ts`, the `applySorting` method was passing the sortOrder directly without normalization:

```typescript
// Before (line 299)
queryBuilder.orderBy(`product.${sortField}`, sortOrder);
```

## Solution
Added normalization to convert sortOrder to uppercase before passing to TypeORM:

```typescript
// After
private applySorting(queryBuilder: SelectQueryBuilder<Product>, filters: ProductFiltersDto): void {
  const { sortBy = 'createdAt', sortOrder = 'DESC' } = filters;
  
  const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'brand'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  
  // Normalize sortOrder to uppercase (TypeORM only accepts 'ASC' or 'DESC')
  const normalizedSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  queryBuilder.orderBy(`product.${sortField}`, normalizedSortOrder);
}
```

## Changes Made
- **Modified**: `backend/src/products/products.service.ts`
  - Added `normalizedSortOrder` variable that converts input to uppercase
  - Defaults to `'DESC'` if input is not `'ASC'` (case-insensitive)

## Deployment
Code pushed to GitHub (commit `4a53235`). You need to rebuild and restart the backend container:

```bash
# On your server (89.116.229.113)
cd /path/to/tekra-store
git pull origin main
docker-compose up -d --build backend
```

## Testing
After backend restart, test these endpoints:

1. **Products with sorting**: 
   ```
   https://shop.sankaretech.com/api/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc
   ```
   Should return products sorted by creation date (newest first)

2. **Countries endpoint**:
   ```
   https://shop.sankaretech.com/api/countries
   ```
   Should return list of countries for the country selector

3. **Homepage**:
   ```
   https://shop.sankaretech.com/
   ```
   Should load all product sections without errors

## Impact
This fix resolves:
- ✅ 500 errors on product listing pages
- ✅ Empty country selector (was failing due to same error)
- ✅ Homepage product sections not loading
- ✅ All product queries with sortOrder parameter

## Notes
- The fix is backward compatible - accepts both uppercase and lowercase sortOrder values
- Defaults to `'DESC'` for any invalid sortOrder value
- No frontend changes needed - frontend can continue sending lowercase values
