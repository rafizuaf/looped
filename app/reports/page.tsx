"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { TimeRange } from "@/types"
import { LoadingIndicator } from "@/components/ui/loading-indicator"

interface Batch {
  id: string;
  name: string;
  purchase_date: string;
  total_items: number;
  items: {
    purchase_price: number;
    selling_price: number;
    sold_status: string;
    category: string;
  }[];
  operational_costs: {
    amount: number;
  }[];
}

interface FinancialData {
  date: string;
  income: number;
  expenses: number;
}

export default function ReportsPage() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly")
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data from database
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch batches with their items and operational costs
        const { data: batchesData, error: batchesError } = await supabase
          .from("batches")
          .select(`
            id,
            name,
            purchase_date,
            total_items,
            items (
              purchase_price,
              selling_price,
              sold_status,
              category
            ),
            operational_costs (
              amount
            )
          `)
          .is("deleted_at", null)
          .order("purchase_date", { ascending: true });

        if (batchesError) throw batchesError;
        setBatches(batchesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Category distribution data
  const categoryData = batches.reduce((acc, batch) => {
    batch.items.forEach(item => {
      const existingCategory = acc.find(cat => cat.name === item.category);
      if (existingCategory) {
        existingCategory.value++;
      } else {
        acc.push({
          name: item.category,
          value: 1
        });
      }
    });
    return acc;
  }, [] as { name: string; value: number }[]);

  // Status distribution data
  const statusData = batches.reduce((acc, batch) => {
    const soldCount = batch.items.filter(item => item.sold_status === "sold").length;
    const unsoldCount = batch.items.filter(item => item.sold_status === "unsold").length;

    acc[0].value += soldCount;
    acc[1].value += unsoldCount;

    return acc;
  }, [
    { name: "Sold", value: 0 },
    { name: "Unsold", value: 0 }
  ]);

  // Financial data for charts
  const financialData = batches.reduce((acc: { [key: string]: FinancialData }, batch) => {
    const date = new Date(batch.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Calculate revenue and costs for sold items
    const soldItems = batch.items.filter(item => item.sold_status === 'sold');
    const unsoldItems = batch.items.filter(item => item.sold_status === 'unsold');

    // Calculate actual revenue from sold items
    const income = soldItems.reduce((sum, item) => sum + item.selling_price, 0);

    // Calculate costs for both sold and unsold items
    const soldCosts = soldItems.reduce((sum, item) => sum + item.purchase_price, 0);
    const unsoldCosts = unsoldItems.reduce((sum, item) => sum + item.purchase_price, 0);

    // Calculate operational costs
    const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
    const operationalCostPerItem = operationalCosts / batch.total_items;

    // Add operational costs to both sold and unsold items
    const totalSoldCosts = soldCosts + (operationalCostPerItem * soldItems.length);
    const totalUnsoldCosts = unsoldCosts + (operationalCostPerItem * unsoldItems.length);
    const expenses = totalSoldCosts + totalUnsoldCosts;

    if (!acc[date]) {
      acc[date] = { date, income: 0, expenses: 0 };
    }
    acc[date].income += income;
    acc[date].expenses += expenses;

    return acc;
  }, {});

  // Convert to array and sort by date
  const sortedFinancialData = Object.values(financialData).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  // Profitability data
  const profitabilityData = sortedFinancialData.map(data => ({
    name: data.date,
    profit: data.income - data.expenses,
    profitMargin: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0
  }));

  // Colors for charts
  const COLORS = ["#4CAF50", "#2196F3", "#FFC107", "#9C27B0", "#FF5722", "#607D8B"]
  const PROFIT_COLORS = {
    positive: "#4CAF50",
    negative: "#F44336"
  }
  const STATUS_COLORS = ["#4CAF50", "#FFC107"]

  if (isLoading) {
    return (
      <LoadingIndicator fullPage />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">
          Analyze your thrift shop financial performance
        </p>
      </div>

      <div className="flex justify-end mt-6">
        <Select
          value={timeRange}
          onValueChange={(value: TimeRange) => setTimeRange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <CardDescription>
                Monthly comparison of revenue and expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sortedFinancialData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis
                      dataKey="date"
                      stroke={isDark ? "#888" : "#888"}
                    />
                    <YAxis
                      stroke={isDark ? "#888" : "#888"}
                      tickFormatter={(value) => `${value / 1000}K`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        borderColor: isDark ? "#333" : "#e2e8f0",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Revenue"
                      stroke="#4CAF50"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#F44336"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Trend</CardTitle>
              <CardDescription>
                Monthly profit analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profitabilityData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                    <XAxis dataKey="name" stroke={isDark ? "#888" : "#888"} />
                    <YAxis
                      stroke={isDark ? "#888" : "#888"}
                      tickFormatter={(value) => `${value / 1000}K`}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "profit") return formatCurrency(Number(value))
                        return `${Number(value).toFixed(1)}%`
                      }}
                      contentStyle={{
                        backgroundColor: isDark ? "#1f1f1f" : "#fff",
                        borderColor: isDark ? "#333" : "#e2e8f0",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                      {profitabilityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.profit >= 0 ? PROFIT_COLORS.positive : PROFIT_COLORS.negative}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="profitMargin" name="Profit Margin (%)" radius={[4, 4, 0, 0]} fill="#2196F3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Items by Category</CardTitle>
                <CardDescription>
                  Distribution of items across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} items`, "Quantity"]}
                        contentStyle={{
                          backgroundColor: isDark ? "#1f1f1f" : "#fff",
                          borderColor: isDark ? "#333" : "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items by Status</CardTitle>
                <CardDescription>
                  Sold vs Unsold items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} items`, "Quantity"]}
                        contentStyle={{
                          backgroundColor: isDark ? "#1f1f1f" : "#fff",
                          borderColor: isDark ? "#333" : "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}