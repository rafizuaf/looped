"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight, Package } from "lucide-react"
import type { Item } from "@/types"
import { formatCurrency, calculateItemMetrics } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

interface ItemsTableProps {
    items: Item[]
    batchId: string
    totalOperationalCosts: number
    onDeleteItem: (itemId: string) => void
}

export function ItemsTable({ items, batchId, totalOperationalCosts, onDeleteItem }: ItemsTableProps) {
    const hasItems = items.length > 0

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <CardTitle>Items</CardTitle>
                        <CardDescription>All items in this batch</CardDescription>
                    </div>
                    <Button className="w-full sm:w-auto mt-2 sm:mt-0" variant="outline" asChild>
                        <Link href={`/items/new?batch=${batchId}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Items
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {hasItems ? (
                    <div className="overflow-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle p-4 sm:p-0">
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Name</TableHead>
                                            <TableHead className="whitespace-nowrap">Category</TableHead>
                                            <TableHead className="whitespace-nowrap">Purchase Price</TableHead>
                                            <TableHead className="whitespace-nowrap">Total Cost</TableHead>
                                            <TableHead className="whitespace-nowrap">Selling Price</TableHead>
                                            <TableHead className="whitespace-nowrap">Margin</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <ItemRow
                                                key={item.id}
                                                item={item}
                                                totalOperationalCosts={totalOperationalCosts}
                                                itemsLength={items.length}
                                                onDelete={() => onDeleteItem(item.id)}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        icon={<Package className="h-12 w-12" />}
                        title="No items yet"
                        description="Add items to this batch to track inventory and sales."
                        action={
                            <Button asChild>
                                <Link href={`/items/new?batch=${batchId}`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Item
                                </Link>
                            </Button>
                        }
                    />
                )}
            </CardContent>
        </Card>
    )
}

interface ItemRowProps {
    item: Item
    totalOperationalCosts: number
    itemsLength: number
    onDelete: () => void
}

function ItemRow({ item, totalOperationalCosts, itemsLength, onDelete }: ItemRowProps) {
    const { totalCost, marginValue, marginPercentage } = calculateItemMetrics(item, totalOperationalCosts, itemsLength)
    const isProfitable = marginValue > 0

    return (
        <TableRow>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
            <TableCell>{formatCurrency(totalCost)}</TableCell>
            <TableCell>{formatCurrency(item.selling_price)}</TableCell>
            <TableCell>
                <ProfitIndicator
                    isProfitable={isProfitable}
                    value={item.sold_status === "sold" ? `${marginPercentage.toFixed(1)}%` : "Projected"}
                />
            </TableCell>
            <TableCell>
                <StatusBadge status={item.sold_status} />
            </TableCell>
            <TableCell>
                <TableActions editHref={`/items/${item.id}/edit`} onDelete={onDelete} />
            </TableCell>
        </TableRow>
    )
}

interface ProfitIndicatorProps {
    isProfitable: boolean
    value: string
}

function ProfitIndicator({ isProfitable, value }: ProfitIndicatorProps) {
    return (
        <div className={`flex items-center ${isProfitable ? "text-green-600" : "text-red-600"}`}>
            {isProfitable ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
            {value}
        </div>
    )
}

interface StatusBadgeProps {
    status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <div
            className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${status === "sold"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                }`}
        >
            {status === "sold" ? "Sold" : "Unsold"}
        </div>
    )
}

interface TableActionsProps {
    editHref: string
    onDelete: () => void
}

function TableActions({ editHref, onDelete }: TableActionsProps) {
    return (
        <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href={editHref}>
                    <Edit className="h-4 w-4" />
                </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
        </div>
    )
}