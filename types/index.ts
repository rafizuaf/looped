export interface Item {
  id: string;
  name: string;
  category: string;
  batchId: string;
  purchasePrice: number;
  sellingPrice: number;
  marginPercentage: number;
  marginValue: number;
  soldStatus: 'sold' | 'unsold';
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  purchaseDate: Date;
  totalItems: number;
  totalCost: number;
  totalSold: number;
  totalRevenue: number;
  operationalCosts: OperationalCost[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationalCost {
  id: string;
  batchId: string;
  name: string;
  amount: number;
  date: Date;
}

export interface FinancialData {
  date: string;
  expenses: number;
  income: number;
}

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DashboardStats {
  totalBatches: number;
  totalItems: number;
  totalSold: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}