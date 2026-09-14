export type PackageDistributionPoint = {
  name: string;
  count: number;
};

export type MonthlyRevenuePoint = {
  monthKey: string;
  monthLabel: string;
  monthTooltip: string;
  revenue: number;
};
