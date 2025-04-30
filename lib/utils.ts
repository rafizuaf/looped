import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const calculateItemMetrics = (item: any, totalOperationalCosts: number, itemsLength: number) => {
  // Calculate operational cost per item
  const operationalCostPerItem = totalOperationalCosts / itemsLength
  const totalItemCost = item.purchase_price + operationalCostPerItem

  // Calculate profit value
  const profitValue = item.sold_status === "sold" ? item.selling_price - totalItemCost : 0

  // Calculate true margin percentage (profit divided by selling price)
  const trueMarginPercentage = item.sold_status === "sold" && item.selling_price > 0
    ? (profitValue / item.selling_price) * 100
    : 0

  // Calculate ROI/markup percentage (profit divided by cost)
  const roiPercentage = item.sold_status === "sold" && totalItemCost > 0
    ? (profitValue / totalItemCost) * 100
    : 0

  return {
    totalCost: totalItemCost,
    marginValue: profitValue,
    marginPercentage: roiPercentage, // Using ROI/markup as the default displayed percentage
    trueMarginPercentage, // Adding the true margin calculation as an additional property
  }
}