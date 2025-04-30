"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BarChart, LineChart, ShoppingBag, CreditCard, ArrowUpRight, ArrowDownRight, Edit, Wallet, Plus } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { DataTable } from "@/components/dashboard/items-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Batch {
    id: string;
    name: string;
    description: string;
    purchase_date: string;
    total_items: number;
    total_cost: number;
    total_sold: number;
    total_revenue: number;
    items: {
        purchase_price: number;
        selling_price: number;
        sold_status: string;
    }[];
    operational_costs: {
        amount: number;
    }[];
}

interface Item {
    id: string;
    name: string;
    category: string;
    purchase_price: number;
    selling_price: number;
    margin_percentage: number;
    margin_value: number;
    sold_status: string;
    total_cost: number;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
    batch_id: string;
}

interface DashboardStats {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalSold: number;
    totalItems: number;
}

interface FinancialData {
    date: string;
    income: number;
    expenses: number;
}

interface BudgetStatistics {
    total_sales: number;
    top_up_count: number;
    total_top_ups: number;
    item_sale_count: number;
    batch_purchase_count: number;
    total_batch_purchases: number;
    operational_cost_count: number;
    total_operational_costs: number;
}

interface BudgetData {
    statistics: BudgetStatistics;
    current_budget: number;
    budget_created_at: string;
    budget_updated_at: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalSold: 0,
        totalItems: 0
    });
    const [financialData, setFinancialData] = useState<FinancialData[]>([]);
    const [budgetData, setBudgetData] = useState<BudgetData>({
        statistics: {
            total_sales: 0,
            top_up_count: 0,
            total_top_ups: 0,
            item_sale_count: 0,
            batch_purchase_count: 0,
            total_batch_purchases: 0,
            operational_cost_count: 0,
            total_operational_costs: 0
        },
        current_budget: 0,
        budget_created_at: '',
        budget_updated_at: ''
    });

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                const supabase = createClient();

                // Fetch budget data
                const { data: budgetData, error: budgetError } = await supabase
                    .rpc('get_budget_summary', {
                        p_user_id: user.id
                    });

                if (budgetError) throw budgetError;
                setBudgetData(budgetData || {
                    statistics: {
                        total_sales: 0,
                        top_up_count: 0,
                        total_top_ups: 0,
                        item_sale_count: 0,
                        batch_purchase_count: 0,
                        total_batch_purchases: 0,
                        operational_cost_count: 0,
                        total_operational_costs: 0
                    },
                    current_budget: 0,
                    budget_created_at: '',
                    budget_updated_at: ''
                });

                // Fetch batches
                const { data: batchesData, error: batchesError } = await supabase
                    .from("batches")
                    .select(`
                        *,
                        items (
                            purchase_price,
                            selling_price,
                            sold_status
                        ),
                        operational_costs (
                            amount
                        )
                    `)
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false })
                    .limit(5);

                if (batchesError) throw batchesError;

                setBatches(batchesData || []);

                // Calculate dashboard stats
                if (batchesData) {
                    const stats = batchesData.reduce((acc: DashboardStats, batch: Batch) => {
                        const soldItems = batch.items.filter(item => item.sold_status === 'sold');
                        const unsoldItems = batch.items.filter(item => item.sold_status === 'unsold');

                        // Calculate actual revenue and costs for sold items
                        const actualRevenue = soldItems.reduce((sum, item) => sum + item.selling_price, 0);
                        const soldCosts = soldItems.reduce((sum, item) => sum + item.purchase_price, 0);

                        // Calculate costs for unsold items (only purchase price, no revenue)
                        const unsoldCosts = unsoldItems.reduce((sum, item) => sum + item.purchase_price, 0);

                        // Calculate operational costs per item
                        const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
                        const operationalCostPerItem = operationalCosts / batch.total_items;

                        // Add operational costs to both sold and unsold items
                        const totalSoldCosts = soldCosts + (operationalCostPerItem * soldItems.length);
                        const totalUnsoldCosts = unsoldCosts + (operationalCostPerItem * unsoldItems.length);

                        acc.totalRevenue += actualRevenue; // Only count revenue from sold items
                        acc.totalExpenses += totalSoldCosts + totalUnsoldCosts;
                        acc.totalSold += soldItems.length;
                        acc.totalItems += batch.total_items || 0;
                        return acc;
                    }, {
                        totalRevenue: 0,
                        totalExpenses: 0,
                        totalSold: 0,
                        totalItems: 0
                    });

                    stats.netProfit = stats.totalRevenue - stats.totalExpenses;
                    setDashboardStats(stats);

                    // Generate financial data for chart
                    const monthlyData = batchesData.reduce((acc: { [key: string]: FinancialData }, batch: Batch) => {
                        const date = new Date(batch.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        const soldItems = batch.items.filter(item => item.sold_status === 'sold');
                        const unsoldItems = batch.items.filter(item => item.sold_status === 'unsold');

                        // Calculate actual revenue and costs for sold items
                        const income = soldItems.reduce((sum, item) => sum + item.selling_price, 0);
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
                        acc[date].income += income; // Only count income from sold items
                        acc[date].expenses += expenses;

                        return acc;
                    }, {});

                    const sortedData = Object.values(monthlyData).sort((a, b) => {
                        const dateA = new Date((a as FinancialData).date).getTime();
                        const dateB = new Date((b as FinancialData).date).getTime();
                        return dateA - dateB;
                    }) as FinancialData[];
                    setFinancialData(sortedData);
                }

                // Fetch items
                const { data: itemsData, error: itemsError } = await supabase
                    .from("items")
                    .select("*")
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false });

                if (itemsError) throw itemsError;
                setItems(itemsData || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    const columns = [
        {
            accessorKey: "name",
            header: "Item Name",
        },
        {
            accessorKey: "category",
            header: "Category",
        },
        {
            accessorKey: "batch_id",
            header: "Batch",
            cell: ({ row }: any) => {
                const batch = batches.find(b => b.id === row.original.batch_id);
                return batch ? (
                    <Link
                        href={`/batches/${batch.id}`}
                        className="text-sm font-medium leading-none hover:underline"
                    >
                        {batch.name}
                    </Link>
                ) : 'Unknown Batch';
            },
        },
        {
            accessorKey: "purchase_price",
            header: "Purchase Price",
            cell: ({ row }: any) => formatCurrency(row.original.purchase_price),
        },
        {
            accessorKey: "total_cost",
            header: "Total Cost",
            cell: ({ row }: any) => {
                // Find the batch for this item
                const batch = batches.find(b => b.id === row.original.batch_id);
                if (!batch) return formatCurrency(row.original.purchase_price);

                // Calculate operational cost per item
                const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
                const operationalCostPerItem = operationalCosts / batch.total_items;
                const totalCostPerItem = row.original.purchase_price + operationalCostPerItem;

                return formatCurrency(totalCostPerItem);
            },
        },
        {
            accessorKey: "selling_price",
            header: "Selling Price",
            cell: ({ row }: any) => formatCurrency(row.original.selling_price),
        },
        {
            accessorKey: "margin_percentage",
            header: "Margin %",
            cell: ({ row }: any) => {
                // Find the batch for this item
                const batch = batches.find(b => b.id === row.original.batch_id);
                if (!batch) return "0%";

                // Calculate operational cost per item
                const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
                const operationalCostPerItem = operationalCosts / batch.total_items;
                const totalCostPerItem = row.original.purchase_price + operationalCostPerItem;

                // Calculate margin
                const marginValue = row.original.selling_price - totalCostPerItem;
                const marginPercentage = (marginValue / totalCostPerItem) * 100;

                return `${marginPercentage.toFixed(1)}%`;
            },
        },
        {
            accessorKey: "margin_value",
            header: "Margin (Rp)",
            cell: ({ row }: any) => {
                // Find the batch for this item
                const batch = batches.find(b => b.id === row.original.batch_id);
                if (!batch) return formatCurrency(0);

                // Calculate operational cost per item
                const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
                const operationalCostPerItem = operationalCosts / batch.total_items;
                const totalCostPerItem = row.original.purchase_price + operationalCostPerItem;

                // Calculate margin
                const marginValue = row.original.selling_price - totalCostPerItem;

                return formatCurrency(marginValue);
            },
        },
        {
            accessorKey: "sold_status",
            header: "Status",
            cell: ({ row }: any) => (
                <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${row.original.sold_status === "sold"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                    }`}>
                    {row.original.sold_status === "sold" ? "Sold" : "Unsold"}
                </div>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }: any) => (
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/items/${row.original.id}/edit`}>
                        <Edit className="h-4 w-4" />
                    </Link>
                </Button>
            ),
        },
    ];

    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to the looped thrift shop management dashboard
                </p>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mt-6">
                <StatsCard
                    title="Total Revenue"
                    value={formatCurrency(dashboardStats.totalRevenue)}
                    description="Total revenue from sold items"
                    icon={<CreditCard className="h-4 w-4" />}
                    className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                />
                <StatsCard
                    title="Total Expenses"
                    value={formatCurrency(dashboardStats.totalExpenses)}
                    description="Total expenses (items + operational costs)"
                    icon={<ShoppingBag className="h-4 w-4" />}
                    className={`${dashboardStats.totalExpenses > dashboardStats.totalRevenue
                        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'}`}
                />
                <StatsCard
                    title="Net Profit"
                    value={formatCurrency(dashboardStats.netProfit)}
                    description={
                        dashboardStats.netProfit > 0
                            ? "Profitable inventory"
                            : "Loss on inventory"
                    }
                    icon={
                        dashboardStats.netProfit > 0
                            ? <ArrowUpRight className="h-4 w-4 text-green-700 dark:text-green-300" />
                            : <ArrowDownRight className="h-4 w-4 text-red-700 dark:text-red-300" />
                    }
                    className={`${dashboardStats.netProfit > 0
                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}
                />
                <StatsCard
                    title="Items Sold"
                    value={`${dashboardStats.totalSold}/${dashboardStats.totalItems}`}
                    description={dashboardStats.totalItems > 0
                        ? `${Math.round((dashboardStats.totalSold / dashboardStats.totalItems) * 100)}% sell-through rate`
                        : "No items added yet"}
                    icon={<BarChart className="h-4 w-4" />}
                    className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                />
                <StatsCard
                    title="Current Budget"
                    value={formatCurrency(budgetData.current_budget)}
                    description={
                        budgetData.statistics.top_up_count > 0
                            ? `${budgetData.statistics.top_up_count} top-ups, total ${formatCurrency(budgetData.statistics.total_top_ups)}`
                            : "No top-ups yet"
                    }
                    icon={<Wallet className="h-4 w-4" />}
                    className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
                <OverviewChart data={financialData} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-4">
                <div className="grid gap-4">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Budget Summary</CardTitle>
                            <CardDescription>Your current budget status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Current Balance</p>
                                        <p className="text-2xl font-bold">{formatCurrency(budgetData.current_budget)}</p>
                                    </div>
                                    <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Total Top-ups</span>
                                        <span className="text-sm font-medium">{formatCurrency(budgetData.statistics.total_top_ups)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Total Sales</span>
                                        <span className="text-sm font-medium">{formatCurrency(budgetData.statistics.total_sales)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Total Purchases</span>
                                        <span className="text-sm font-medium">{formatCurrency(budgetData.statistics.total_batch_purchases)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Total Operational Costs</span>
                                        <span className="text-sm font-medium">{formatCurrency(budgetData.statistics.total_operational_costs)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Last Updated</span>
                                        <span className="text-sm font-medium">
                                            {new Date(budgetData.budget_updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <Link href="/budget" passHref>
                                    <Button variant="outline" className="w-full" size="sm">
                                        Manage Budget
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Batches</CardTitle>
                                <CardDescription>Latest thrift batches added</CardDescription>
                            </div>
                            <Link href="/batches/new" passHref>
                                <Button variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Batch
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {batches.map((batch) => {
                                    const soldItems = batch.items.filter(item => item.sold_status === 'sold');
                                    const unsoldItems = batch.items.filter(item => item.sold_status === 'unsold');

                                    // Calculate actual revenue and costs for sold items
                                    const actualRevenue = soldItems.reduce((sum, item) => sum + item.selling_price, 0);
                                    const soldCosts = soldItems.reduce((sum, item) => sum + item.purchase_price, 0);
                                    const unsoldCosts = unsoldItems.reduce((sum, item) => sum + item.purchase_price, 0);

                                    // Calculate operational costs
                                    const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
                                    const operationalCostPerItem = operationalCosts / batch.total_items;

                                    // Add operational costs to both sold and unsold items
                                    const totalSoldCosts = soldCosts + (operationalCostPerItem * soldItems.length);
                                    const totalUnsoldCosts = unsoldCosts + (operationalCostPerItem * unsoldItems.length);
                                    const totalCost = totalSoldCosts + totalUnsoldCosts;

                                    const profit = actualRevenue - totalCost; // Only count actual revenue from sold items

                                    return (
                                        <div key={batch.id} className="flex items-center gap-4">
                                            <div className="rounded-full p-2 bg-primary/10">
                                                <LineChart className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Link
                                                    href={`/batches/${batch.id}`}
                                                    className="text-sm font-medium leading-none hover:underline"
                                                >
                                                    {batch.name}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(batch.purchase_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className={`text-sm font-medium flex items-center ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {profit > 0 ? (
                                                    <ArrowUpRight className="h-4 w-4 mr-1" />
                                                ) : (
                                                    <ArrowDownRight className="h-4 w-4 mr-1" />
                                                )}
                                                {formatCurrency(profit)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <Link href="/batches" passHref>
                                    <Button variant="outline" className="w-full" size="sm">
                                        View All Batches
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                </div>


                <div className="lg:col-span-3">
                    <DataTable
                        columns={columns}
                        data={items}
                        searchColumn="name"
                        filterColumn="batch_id"
                        filterOptions={batches.map(batch => batch.id)}
                        batches={batches}
                    />
                </div>
            </div>

            <div className="mt-6">
            </div>
        </>
    );
}