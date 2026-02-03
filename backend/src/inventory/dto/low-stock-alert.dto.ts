export class LowStockAlertDto {
  id: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  lowStockThreshold: number;
  warehouseLocation?: string;
  supplierId?: string;
  lastUpdated: Date;
}