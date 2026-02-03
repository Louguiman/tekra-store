export class InventoryTurnoverDto {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  totalSold: number;
  turnoverRatio: number;
  daysOfInventory: number | null;
  averagePrice: number;
  revenue: number;
  warehouseLocation: string;
  supplierId?: string;
}