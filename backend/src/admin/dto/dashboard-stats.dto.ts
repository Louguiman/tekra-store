import { Order } from '../../entities/order.entity';

export class DashboardStatsDto {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  recentOrders: Order[];
}