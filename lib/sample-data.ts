import { Batch, Item, FinancialData, DashboardStats, OperationalCost } from "@/types";

const operationalCosts: OperationalCost[] = [
  {
    id: "op-cost-1",
    batchId: "batch-1",
    name: "Transportation",
    amount: 50000,
    date: new Date("2023-05-01"),
  },
  {
    id: "op-cost-2",
    batchId: "batch-1",
    name: "Cleaning",
    amount: 20000,
    date: new Date("2023-05-02"),
  },
  {
    id: "op-cost-3",
    batchId: "batch-2",
    name: "Transportation",
    amount: 75000,
    date: new Date("2023-06-10"),
  },
  {
    id: "op-cost-4",
    batchId: "batch-2",
    name: "Laundry",
    amount: 35000,
    date: new Date("2023-06-11"),
  },
];

export const batches: Batch[] = [
  {
    id: "batch-1",
    name: "Summer Collection",
    description: "Summer clothes collection from local thrift markets",
    purchaseDate: new Date("2023-05-01"),
    totalItems: 20,
    totalCost: 1500000,
    totalSold: 15,
    totalRevenue: 2500000,
    operationalCosts: operationalCosts.filter(cost => cost.batchId === "batch-1"),
    createdAt: new Date("2023-05-01"),
    updatedAt: new Date("2023-05-01"),
  },
  {
    id: "batch-2",
    name: "Vintage Denim",
    description: "Premium vintage denim collection",
    purchaseDate: new Date("2023-06-10"),
    totalItems: 15,
    totalCost: 2000000,
    totalSold: 10,
    totalRevenue: 3000000,
    operationalCosts: operationalCosts.filter(cost => cost.batchId === "batch-2"),
    createdAt: new Date("2023-06-10"),
    updatedAt: new Date("2023-06-10"),
  },
];

const calculateMargin = (purchasePrice: number, sellingPrice: number) => {
  const marginValue = sellingPrice - purchasePrice;
  const marginPercentage = (marginValue / purchasePrice) * 100;
  return { marginValue, marginPercentage };
};

export const items: Item[] = [
  {
    id: "item-1",
    name: "Vintage T-Shirt",
    category: "Clothing",
    batchId: "batch-1",
    purchasePrice: 50000,
    sellingPrice: 120000,
    ...calculateMargin(50000, 120000),
    soldStatus: "sold",
    totalCost: 55000, // Purchase price + allocated operational costs
    createdAt: new Date("2023-05-01"),
    updatedAt: new Date("2023-05-10"),
  },
  {
    id: "item-2",
    name: "Denim Jacket",
    category: "Outerwear",
    batchId: "batch-1",
    purchasePrice: 150000,
    sellingPrice: 300000,
    ...calculateMargin(150000, 300000),
    soldStatus: "sold",
    totalCost: 155000,
    createdAt: new Date("2023-05-01"),
    updatedAt: new Date("2023-05-12"),
  },
  {
    id: "item-3",
    name: "Leather Handbag",
    category: "Accessories",
    batchId: "batch-1",
    purchasePrice: 200000,
    sellingPrice: 450000,
    ...calculateMargin(200000, 450000),
    soldStatus: "unsold",
    totalCost: 205000,
    createdAt: new Date("2023-05-01"),
    updatedAt: new Date("2023-05-01"),
  },
  {
    id: "item-4",
    name: "Vintage Jeans",
    category: "Clothing",
    batchId: "batch-2",
    purchasePrice: 180000,
    sellingPrice: 350000,
    ...calculateMargin(180000, 350000),
    soldStatus: "sold",
    totalCost: 187000,
    createdAt: new Date("2023-06-10"),
    updatedAt: new Date("2023-06-15"),
  },
  {
    id: "item-5",
    name: "Retro Sunglasses",
    category: "Accessories",
    batchId: "batch-2",
    purchasePrice: 75000,
    sellingPrice: 180000,
    ...calculateMargin(75000, 180000),
    soldStatus: "sold",
    totalCost: 82000,
    createdAt: new Date("2023-06-10"),
    updatedAt: new Date("2023-06-18"),
  },
];

export const financialData: FinancialData[] = [
  { date: "Jan", expenses: 1200000, income: 1800000 },
  { date: "Feb", expenses: 1500000, income: 2000000 },
  { date: "Mar", expenses: 1800000, income: 2200000 },
  { date: "Apr", expenses: 1600000, income: 2500000 },
  { date: "May", expenses: 2000000, income: 3000000 },
  { date: "Jun", expenses: 1900000, income: 3200000 },
  { date: "Jul", expenses: 2100000, income: 3500000 },
];

export const dashboardStats: DashboardStats = {
  totalBatches: batches.length,
  totalItems: items.length,
  totalSold: items.filter(item => item.soldStatus === "sold").length,
  totalRevenue: items
    .filter(item => item.soldStatus === "sold")
    .reduce((sum, item) => sum + item.sellingPrice, 0),
  totalExpenses: batches.reduce((sum, batch) => sum + batch.totalCost, 0),
  netProfit: items
    .filter(item => item.soldStatus === "sold")
    .reduce((sum, item) => sum + item.sellingPrice, 0) - batches.reduce((sum, batch) => sum + batch.totalCost, 0),
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};