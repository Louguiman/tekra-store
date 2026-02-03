export class RevenueReportDto {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  revenueByPaymentMethod: Array<{
    paymentMethod: string;
    revenue: number;
    orderCount: number;
  }>;
}