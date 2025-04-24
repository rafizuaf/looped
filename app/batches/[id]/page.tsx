"use client"

import { useState, useEffect } from "react"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, Box, Clock, Users, Edit, Trash2, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Batch {
  id: string
  name: string
  description: string | null
  purchase_date: string
  total_items: number
  total_cost: number
  total_sold: number
  total_revenue: number
  created_at: string
  updated_at: string
  user_id: string
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

interface OperationalCost {
  id: string
  name: string
  amount: number
  date: string
  created_at: string
  user_id: string
  batch_id: string
}

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [operationalCosts, setOperationalCosts] = useState<OperationalCost[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchBatchData() {
      if (!user) return

      try {
        // Fetch batch with items
        const { data: batchData, error: batchError } = await supabase
          .from("batches")
          .select(`
            *,
            items (
              purchase_price,
              selling_price,
              sold_status
            )
          `)
          .eq("id", params.id)
          .is("deleted_at", null)
          .single()

        if (batchError) throw batchError
        if (!batchData) {
          notFound()
        }

        // Calculate actual revenue and sold items
        const soldItems = batchData.items.filter((item: any) => item.sold_status === 'sold');
        const actualRevenue = soldItems.reduce((sum: number, item: any) => sum + item.selling_price, 0);
        const actualSold = soldItems.length;

        // Update batch data with actual values
        const updatedBatch = {
          ...batchData,
          total_revenue: actualRevenue,
          total_sold: actualSold
        };

        setBatch(updatedBatch)

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("*")
          .eq("batch_id", params.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        if (itemsError) throw itemsError
        setItems(itemsData || [])

        // Fetch operational costs
        const { data: costsData, error: costsError } = await supabase
          .from("operational_costs")
          .select("*")
          .eq("batch_id", params.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        if (costsError) throw costsError
        setOperationalCosts(costsData || [])
      } catch (error) {
        console.error("Error fetching batch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBatchData()
  }, [user, params.id, supabase])

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", itemId)

      if (error) throw error

      setItems(items.filter(item => item.id !== itemId))
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (batchId: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete batch')
      }

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      })

      // Redirect to batches page
      window.location.href = '/batches'
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete batch",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>Loading batch details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!batch) {
    notFound()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const totalOperationalCosts = operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
  const totalProfit = batch.total_revenue - batch.total_cost - totalOperationalCosts
  const profitPercentage = (totalProfit / (batch.total_cost + totalOperationalCosts)) * 100

  // Calculate metrics for an item
  const calculateItemMetrics = (item: any) => {
    // Calculate operational cost per item
    const operationalCostPerItem = totalOperationalCosts / items.length;
    const totalItemCost = item.purchase_price + operationalCostPerItem;
    const marginValue = item.sold_status === 'sold' ? item.selling_price - totalItemCost : 0;
    const marginPercentage = item.sold_status === 'sold' && totalItemCost > 0 ? (marginValue / totalItemCost) * 100 : 0;

    return {
      totalCost: totalItemCost,
      marginValue,
      marginPercentage
    };
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/batches">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{batch.name}</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/batches/${batch.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Batch
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Batch
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Purchase Date</CardDescription>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(batch.purchase_date).toLocaleDateString()}</span>
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Items</CardDescription>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <span>{batch.total_items} Items</span>
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Sold Items</CardDescription>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{batch.total_sold} Items</span>
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardDescription>Last Updated</CardDescription>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(batch.updated_at).toLocaleDateString()}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
            <CardDescription>
              Complete information about this batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{batch.description || "No description provided"}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Financial Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span>{formatCurrency(batch.total_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operational Costs:</span>
                      <span>{formatCurrency(totalOperationalCosts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span>{formatCurrency(batch.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Profit:</span>
                      <span className={totalProfit > 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(totalProfit)}
                        <span className="text-sm ml-1">
                          ({Math.round(profitPercentage)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Items Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Items:</span>
                      <span>{batch.total_items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sold Items:</span>
                      <span>{batch.total_sold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sell-through Rate:</span>
                      <span>
                        {Math.round((batch.total_sold / batch.total_items) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>
                  All items in this batch
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/items/new?batch=${batch.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Items
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const { totalCost, marginValue, marginPercentage } = calculateItemMetrics(item);
                    const isProfitable = marginValue > 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                        <TableCell>{formatCurrency(totalCost)}</TableCell>
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
                          <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            item.sold_status === "sold"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}>
                            {item.sold_status === "sold" ? "Sold" : "Unsold"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <Link href={`/items/${item.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Operational Costs</CardTitle>
                <CardDescription>
                  All operational costs for this batch
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/operational-costs/new?batch=${batch.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationalCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{cost.name}</TableCell>
                      <TableCell>{formatCurrency(cost.amount)}</TableCell>
                      <TableCell>{new Date(cost.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/operational-costs/${cost.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(cost.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will soft delete the batch and all its related items and operational costs.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(batch.id)} className="bg-red-500 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}