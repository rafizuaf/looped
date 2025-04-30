export interface Item {
  id: string;
  name: string;
  category: string;
  batch_id: string;
  purchase_price: number;
  selling_price: number;
  margin_percentage: number;
  margin_value: number;
  sold_status: 'sold' | 'unsold';
  total_cost: number;
  image_url?: string | null;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  purchase_date: Date;
  total_items: number;
  total_cost: number;
  total_sold: number;
  total_revenue: number;
  operational_costs: OperationalCost[];
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OperationalCost {
  id: string
  batch_id?: string
  name: string
  amount: number
  date: string
  category: string
  created_at: string
  user_id: string
  deleted_at?: string
}

export interface FinancialData {
  date: string;
  expenses: number;
  income: number;
}

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DashboardStats {
  total_batches: number;
  total_items: number;
  total_sold: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
}

/** Extra interfaces */
export interface Budget {
  id: string;
  name: string;
  description?: string;
  amount: number;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetTransaction {
  id: string;
  budget_id: string;
  name: string;
  amount: number;
  date: Date;
  type: 'income' | 'expense';
  created_at: Date;
  updated_at: Date;
}