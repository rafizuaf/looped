"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Plus, Edit, Trash2, DollarSign } from "lucide-react"
import type { OperationalCost } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"

const getCategoryVariant = (category: string) => {
    switch (category) {
        case "general":
            return "blue"
        case "equipment":
            return "purple"
        case "props":
            return "amber"
        case "rent":
            return "destructive"
        case "utilities":
            return "aqua"
        case "marketing":
            return "pink"
        case "transportation":
            return "green"
        case "other":
            return "indigo"
        default:
            return "default"
    }
}

const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

interface OperationalCostsTableProps {
    costs: OperationalCost[]
    batchId: string
    onDeleteCost: (costId: string) => void
}

export function OperationalCostsTable({ costs, batchId, onDeleteCost }: OperationalCostsTableProps) {
    const hasCosts = costs.length > 0

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <CardTitle>Operational Costs</CardTitle>
                        <CardDescription>All operational costs for this batch</CardDescription>
                    </div>
                    <Button className="w-full sm:w-auto mt-2 sm:mt-0" variant="outline" asChild>
                        <Link href={`/operational-costs/new?batch=${batchId}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Cost
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {hasCosts ? (
                    <div className="overflow-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle p-4 sm:p-0">
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Name</TableHead>
                                            <TableHead className="whitespace-nowrap">Category</TableHead>
                                            <TableHead className="whitespace-nowrap">Amount</TableHead>
                                            <TableHead className="whitespace-nowrap">Date</TableHead>
                                            <TableHead className="whitespace-nowrap">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {costs.map((cost) => (
                                            <TableRow key={cost.id}>
                                                <TableCell>{cost.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getCategoryVariant(cost.category)}>
                                                        {capitalizeFirstLetter(cost.category)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatCurrency(cost.amount)}</TableCell>
                                                <TableCell>{new Date(cost.date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={`/operational-costs/${cost.id}/edit`}>
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => onDeleteCost(cost.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        icon={<DollarSign className="h-12 w-12" />}
                        title="No operational costs yet"
                        description="Add operational costs to track expenses related to this batch."
                        action={
                            <Button asChild>
                                <Link href={`/operational-costs/new?batch=${batchId}`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Cost
                                </Link>
                            </Button>
                        }
                    />
                )}
            </CardContent>
        </Card>
    )
} 