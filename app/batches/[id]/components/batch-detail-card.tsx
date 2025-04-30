import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Batch } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface BatchDetailsCardProps {
    batch: Batch
    totalOperationalCosts: number
    totalProfit: number
    profitPercentage: number
}

export function BatchDetailsCard({
    batch,
    totalOperationalCosts,
    totalProfit,
    profitPercentage,
}: BatchDetailsCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Details</CardTitle>
                <CardDescription>Complete information about this batch</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium mb-2">Description</h3>
                        <p className="text-muted-foreground">{batch.description || "No description provided"}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                        <FinancialSummary
                            batchCost={batch.total_cost}
                            operationalCosts={totalOperationalCosts}
                            revenue={batch.total_revenue}
                            profit={totalProfit}
                            profitPercentage={profitPercentage}
                        />

                        <ItemsSummary totalItems={batch.total_items} soldItems={batch.total_sold} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface FinancialSummaryProps {
    batchCost: number
    operationalCosts: number
    revenue: number
    profit: number
    profitPercentage: number
}

function FinancialSummary({ batchCost, operationalCosts, revenue, profit, profitPercentage }: FinancialSummaryProps) {
    return (
        <div>
            <h3 className="font-medium mb-2">Financial Summary</h3>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span>{formatCurrency(batchCost)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Operational Costs:</span>
                    <span>{formatCurrency(operationalCosts)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span>{formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Profit:</span>
                    <span className={profit > 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(profit)}
                        <span className="text-sm ml-1">({Math.round(profitPercentage)}%)</span>
                    </span>
                </div>
            </div>
        </div>
    )
}

interface ItemsSummaryProps {
    totalItems: number
    soldItems: number
}

function ItemsSummary({ totalItems, soldItems }: ItemsSummaryProps) {
    const sellThroughRate = totalItems > 0 ? Math.round((soldItems / totalItems) * 100) : 0

    return (
        <div>
            <h3 className="font-medium mb-2">Items Summary</h3>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Sold Items:</span>
                    <span>{soldItems}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Sell-through Rate:</span>
                    <span>{sellThroughRate}%</span>
                </div>
            </div>
        </div>
    )
}