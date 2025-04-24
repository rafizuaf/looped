"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Batch {
  id: string;
  name: string;
  total_items: number;
  operational_costs: {
    amount: number;
  }[];
}

interface Item {
  id: string
  name: string
  category: string
  purchase_price: number
  selling_price: number
  margin_percentage: number
  margin_value: number
  sold_status: string
  total_cost: number
  image_url: string | null
  created_at: string
  updated_at: string
  user_id: string
  batch_id: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  filterColumn?: string
  filterOptions?: string[]
  batches?: Batch[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  filterColumn,
  filterOptions,
  batches,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  // Calculate metrics for an item
  const calculateItemMetrics = (item: any) => {
    if (!batches) return {
      totalCost: item.purchase_price,
      marginValue: item.sold_status === 'sold' ? item.selling_price - item.purchase_price : 0,
      marginPercentage: item.sold_status === 'sold' ? ((item.selling_price - item.purchase_price) / item.purchase_price) * 100 : 0
    };

    const batch = batches.find(b => b.id === item.batch_id);
    if (!batch) return {
      totalCost: item.purchase_price,
      marginValue: item.sold_status === 'sold' ? item.selling_price - item.purchase_price : 0,
      marginPercentage: item.sold_status === 'sold' ? ((item.selling_price - item.purchase_price) / item.purchase_price) * 100 : 0
    };

    // Calculate operational cost per item
    const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
    const operationalCostPerItem = batch.total_items > 0 ? operationalCosts / batch.total_items : 0;
    
    // Calculate total cost including operational costs
    const totalCost = item.purchase_price + operationalCostPerItem;
    
    // Calculate margin
    const marginValue = item.sold_status === 'sold' ? item.selling_price - totalCost : 0;
    const marginPercentage = item.sold_status === 'sold' && totalCost > 0 ? (marginValue / totalCost) * 100 : 0;

    return {
      totalCost,
      marginValue,
      marginPercentage
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items Inventory</CardTitle>
        <CardDescription>Manage your thrift shop inventory</CardDescription>
        <div className="flex flex-col space-y-2 py-2 md:flex-row md:items-center md:space-x-2 md:space-y-0">
          {searchColumn && (
            <Input
              placeholder="Search items..."
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchColumn)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          {filterColumn && filterOptions && (
            <Select
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onValueChange={(value) => {
                table.getColumn(filterColumn)?.setFilterValue(value === "all" ? "" : value)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches?.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const item = row.original as any;
                  const { totalCost, marginValue, marginPercentage } = calculateItemMetrics(item);
                  const isProfitable = marginValue > 0;

                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => {
                        // Custom rendering for margin and total cost columns
                        if (cell.column.id === 'margin_percentage') {
                          return (
                            <TableCell key={cell.id}>
                              <div className={`flex items-center ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                {isProfitable ? (
                                  <ArrowUpRight className="h-4 w-4 mr-1" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4 mr-1" />
                                )}
                                {item.sold_status === 'sold' ? `${marginPercentage.toFixed(1)}%` : 'Projected'}
                              </div>
                            </TableCell>
                          );
                        }
                        if (cell.column.id === 'margin_value') {
                          return (
                            <TableCell key={cell.id}>
                              <div className={`flex items-center ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                {isProfitable ? (
                                  <ArrowUpRight className="h-4 w-4 mr-1" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4 mr-1" />
                                )}
                                {item.sold_status === 'sold' ? formatCurrency(marginValue) : 'Projected'}
                              </div>
                            </TableCell>
                          );
                        }
                        if (cell.column.id === 'total_cost') {
                          return (
                            <TableCell key={cell.id}>
                              {formatCurrency(totalCost)}
                            </TableCell>
                          );
                        }
                        if (cell.column.id === 'sold_status') {
                          return (
                            <TableCell key={cell.id}>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                item.sold_status === "sold"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                              }`}>
                                {item.sold_status === "sold" ? "Sold" : "Unsold"}
                              </div>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}