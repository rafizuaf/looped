"use client"

import { useTheme } from "next-themes"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinancialData } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface OverviewChartProps {
  data: FinancialData[]
}

export function OverviewChart({ data }: OverviewChartProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const formatValue = (value: number) => {
    return formatCurrency(value)
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          Monthly income and expenses overview
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
              <XAxis 
                dataKey="date" 
                stroke={isDark ? "#888" : "#888"}
                tick={{ fill: isDark ? "#888" : "#888" }}
              />
              <YAxis 
                stroke={isDark ? "#888" : "#888"}
                tick={{ fill: isDark ? "#888" : "#888" }}
                tickFormatter={(value) => `${value / 1000}K`}
              />
              <Tooltip 
                formatter={(value) => formatValue(Number(value))}
                contentStyle={{
                  backgroundColor: isDark ? "#1f1f1f" : "#fff",
                  borderColor: isDark ? "#333" : "#e2e8f0",
                  color: isDark ? "#fff" : "#000",
                }}
                labelStyle={{
                  color: isDark ? "#fff" : "#000",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#4CAF50"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#F44336"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}