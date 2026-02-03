export class StockLevelReportDto {
  summary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    wellStockedCount: number;
    totalStockValue: number;
  };
  stockByCategory: Array<{
    category: string;
    totalItems: number;
    totalStock: number;
    lowStockItems: number;
    outOfStockItems: number;
  }>;
  lowStockItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    warehouseLocation: string;
    supplierId?: string;
  }>;
  outOfStockItems: Array<{
    productId: string;
    productName: string;
    warehouseLocation: string;
    supplierId?: string;
  }>;
}