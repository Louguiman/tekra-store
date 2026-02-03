# Inventory Management System

This module provides comprehensive inventory management functionality for the e-commerce platform, including stock tracking, reservations, and low stock alerts.

## Features

### Stock Management
- **Real-time stock tracking**: Track quantities for all products
- **Stock updates**: Update stock levels with warehouse location and supplier information
- **Stock adjustments**: Positive and negative adjustments with optional reasons
- **Multi-location support**: Track products across different warehouse locations

### Stock Reservations
- **Temporary reservations**: Reserve stock during checkout process (30-minute expiration)
- **Availability checking**: Check if sufficient stock is available before reservation
- **Automatic cleanup**: Remove expired reservations automatically
- **Transaction safety**: Use database transactions to prevent race conditions

### Low Stock Alerts
- **Configurable thresholds**: Set custom low stock thresholds per product
- **Alert generation**: Generate alerts when stock falls below threshold
- **Admin notifications**: Provide detailed information for restocking decisions

### Supplier Management
- **Supplier tracking**: Maintain supplier reference information for each product
- **Supplier coordination**: Support for coordinating with multiple suppliers

## API Endpoints

### Public Endpoints
- `GET /inventory/product/:productId` - Get inventory for specific product
- `GET /inventory/availability/:productId?quantity=X` - Check stock availability
- `POST /inventory/reservations` - Create stock reservation
- `DELETE /inventory/reservations/:reservationId` - Release stock reservation

### Admin/Staff Endpoints
- `GET /inventory` - Get all inventory items
- `GET /inventory/low-stock?threshold=X` - Get low stock alerts
- `PUT /inventory/product/:productId/stock` - Update stock levels
- `POST /inventory/product/:productId/adjust` - Adjust stock with reason
- `POST /inventory/cleanup-reservations` - Cleanup expired reservations (Admin only)

## Usage Examples

### Check Stock Availability
```typescript
const isAvailable = await inventoryService.checkAvailability('product-id', 5);
if (isAvailable) {
  // Proceed with order
}
```

### Reserve Stock During Checkout
```typescript
const reservation = await inventoryService.reserveStock({
  productId: 'product-id',
  quantity: 2,
  reservationReference: 'order-123'
});
// Reservation expires in 30 minutes
```

### Update Stock Levels
```typescript
await inventoryService.updateStock('product-id', {
  quantity: 100,
  warehouseLocation: 'Warehouse A',
  supplierId: 'supplier-123',
  lowStockThreshold: 10
});
```

### Get Low Stock Alerts
```typescript
const lowStockItems = await inventoryService.getLowStockItems(15);
// Returns products with stock <= 15 units
```

## Database Schema

### InventoryItem Entity
- `id`: UUID primary key
- `quantity`: Current stock quantity
- `warehouseLocation`: Physical location of stock
- `supplierId`: Reference to supplier
- `lowStockThreshold`: Alert threshold
- `productId`: Foreign key to Product entity

### StockReservation Entity
- `id`: UUID primary key
- `productId`: Foreign key to Product entity
- `quantity`: Reserved quantity
- `reservationReference`: Optional reference (e.g., order ID)
- `expiresAt`: Expiration timestamp (30 minutes)

## Requirements Validation

This implementation addresses the following requirements:

- **6.1**: ✅ Track stock quantities for all products
- **6.2**: ✅ Generate alerts when stock levels are low
- **6.3**: ✅ Prevent overselling by checking stock availability during checkout
- **6.4**: ✅ Reflect stock changes in real-time on the storefront
- **6.5**: ✅ Maintain supplier reference information for each product

## Testing

The module includes comprehensive unit tests covering:
- Stock updates and adjustments
- Availability checking with reservations
- Low stock alert generation
- Stock reservation lifecycle
- Error handling scenarios

Run tests with:
```bash
npm test -- inventory
```