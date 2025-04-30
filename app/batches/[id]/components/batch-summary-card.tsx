import type React from "react"
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Calendar, Box, Clock, Users } from "lucide-react"
import type { Batch } from "@/types"

interface BatchSummaryCardsProps {
    batch: Batch
}

export function BatchSummaryCards({ batch }: BatchSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                title="Purchase Date"
                value={new Date(batch.purchase_date).toLocaleDateString()}
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            />

            <MetricCard
                title="Items"
                value={`${batch.total_items} Items`}
                icon={<Box className="h-4 w-4 text-muted-foreground" />}
            />

            <MetricCard
                title="Sold Items"
                value={`${batch.total_sold} Items`}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />

            <MetricCard
                title="Last Updated"
                value={new Date(batch.updated_at).toLocaleDateString()}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
        </div>
    )
}

interface MetricCardProps {
    title: string
    value: string
    icon: React.ReactNode
}

function MetricCard({ title, value, icon }: MetricCardProps) {
    return (
        <Card>
            <CardHeader className="py-4">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-lg flex items-center space-x-2">
                    {icon}
                    <span>{value}</span>
                </CardTitle>
            </CardHeader>
        </Card>
    )
}
