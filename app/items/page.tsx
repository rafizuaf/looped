"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowDownNarrowWide, ArrowUpNarrowWide, ArrowUpRight, ArrowDownRight, Edit, Plus } from "lucide-react"
import Link from "next/link"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"

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

interface SortConfig {
  key: keyof Item | null;
  direction: 'asc' | 'desc';
}

function ItemsContent() {
  const searchParams = useSearchParams()
  const [initialBatchFilter, setInitialBatchFilter] = useState("all")
  const [items, setItems] = useState<Item[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [batchFilter, setBatchFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' })

  // Set initial batch filter from URL params
  useEffect(() => {
    const batch = searchParams.get('batch')
    if (batch) {
      setInitialBatchFilter(batch)
      setBatchFilter(batch)
    }
  }, [searchParams])

  // Fetch items and batches
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (itemsError) throw itemsError;
        setItems(itemsData || []);

        // Fetch batches
        const { data: batchesData, error: batchesError } = await supabase
          .from("batches")
          .select(`
            id,
            name,
            total_items,
            operational_costs (
              amount
            )
          `)
          .is("deleted_at", null);

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

  // Calculate total cost and margin for an item
  const calculateItemMetrics = (item: Item) => {
    const batch = batches.find(b => b.id === item.batch_id);
    if (!batch) return {
      totalCost: item.purchase_price,
      marginValue: item.sold_status === 'sold' ? item.selling_price - item.purchase_price : 0,
      marginPercentage: item.sold_status === 'sold' ? ((item.selling_price - item.purchase_price) / item.purchase_price) * 100 : 0
    };

    // Calculate operational cost per item
    const operationalCosts = batch.operational_costs.reduce((sum, cost) => sum + cost.amount, 0);
    const operationalCostPerItem = operationalCosts / batch.total_items;
    
    // Calculate total cost including operational costs
    const totalCost = item.purchase_price + operationalCostPerItem;
    
    // Calculate margin
    const marginValue = item.sold_status === 'sold' ? item.selling_price - totalCost : 0;
    const marginPercentage = item.sold_status === 'sold' ? (marginValue / totalCost) * 100 : 0;

    return {
      totalCost,
      marginValue,
      marginPercentage
    };
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Search filter
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())

        // Batch filter
        const matchesBatch = batchFilter === "all" || item.batch_id === batchFilter

        // Status filter
        const matchesStatus = statusFilter === "all" || item.sold_status === statusFilter

        return matchesSearch && matchesBatch && matchesStatus
      })
      .sort((a, b) => {
        if (!sortConfig.key) return 0

        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        // Handle null values
        if (aValue === null && bValue === null) return 0
        if (aValue === null) return sortConfig.direction === 'asc' ? -1 : 1
        if (bValue === null) return sortConfig.direction === 'asc' ? 1 : -1

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }, [items, searchTerm, batchFilter, statusFilter, sortConfig])

  // Handle sorting
  const requestSort = (key: keyof Item) => {
    let direction: 'asc' | 'desc' = 'asc'

    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Item) => {
    if (sortConfig.key !== key) return null

    return sortConfig.direction === 'asc'
      ? <ArrowUpNarrowWide className="h-4 w-4 ml-1" />
      : <ArrowDownNarrowWide className="h-4 w-4 ml-1" />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">
          {batchFilter !== "all" ? `Items in Batch ${batches.find(b => b.id === batchFilter)?.name || batchFilter}` : "All Items"}
        </h1>
        <p className="text-muted-foreground">
          Manage your thrift shop inventory
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            value={batchFilter}
            onValueChange={(value) => setBatchFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="unsold">Unsold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" asChild>
          <Link href="/items/new">
          <Plus className="2-4 h-4 mr-2" />
          Add New Item
          </Link>
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Items Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('name')}
                      className="p-0 font-medium flex items-center"
                    >
                      Item Name {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('category')}
                      className="p-0 font-medium flex items-center"
                    >
                      Category {getSortIcon('category')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('purchase_price')}
                      className="p-0 font-medium flex items-center"
                    >
                      Purchase Price {getSortIcon('purchase_price')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('selling_price')}
                      className="p-0 font-medium flex items-center"
                    >
                      Selling Price {getSortIcon('selling_price')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('margin_percentage')}
                      className="p-0 font-medium flex items-center"
                    >
                      Margin % {getSortIcon('margin_percentage')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('margin_value')}
                      className="p-0 font-medium flex items-center"
                    >
                      Margin (Rp) {getSortIcon('margin_value')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('sold_status')}
                      className="p-0 font-medium flex items-center"
                    >
                      Status {getSortIcon('sold_status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('total_cost')}
                      className="p-0 font-medium flex items-center"
                    >
                      Total Cost {getSortIcon('total_cost')}
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const { totalCost, marginValue, marginPercentage } = calculateItemMetrics(item);
                    const isProfitable = marginValue > 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                        <TableCell>{formatCurrency(item.selling_price)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfitable ? (
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                            )}
                            {item.sold_status === 'sold' ? `${marginPercentage.toFixed(1)}%` : 'Projected'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfitable ? (
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                            )}
                            {item.sold_status === 'sold' ? formatCurrency(marginValue) : 'Projected'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            item.sold_status === "sold"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}>
                            {item.sold_status === "sold" ? "Sold" : "Unsold"}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(totalCost)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/items/${item.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>Loading items...</p>
        </div>
      </DashboardLayout>
    }>
      <ItemsContent />
    </Suspense>
  )
}