"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  deleted_at: string | null
}

export default function BatchesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchBatches() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("batches")
          .select(`
            *,
            items (
              purchase_price,
              selling_price,
              sold_status
            )
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })

        if (error) throw error

        // Calculate actual revenue and sold items for each batch
        const updatedBatches = data.map((batch: any) => {
          const soldItems = batch.items.filter((item: any) => item.sold_status === 'sold');
          const actualRevenue = soldItems.reduce((sum: number, item: any) => sum + item.selling_price, 0);
          const actualSold = soldItems.length;

          return {
            ...batch,
            total_revenue: actualRevenue,
            total_sold: actualSold
          };
        });

        setBatches(updatedBatches || [])
      } catch (error) {
        console.error("Error fetching batches:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBatches()
  }, [user, supabase])

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

      // Refresh the page to update the list
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete batch",
        variant: "destructive",
      })
    }
  }

  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>Loading batches...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Batches</h1>
        <p className="text-muted-foreground">
          Manage your thrift shop batches
        </p>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link href="/batches/new" passHref>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add New Batch
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{batch.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {new Date(batch.purchase_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(batch.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm font-medium">Items</p>
                      <p className="text-xl">{batch.total_items}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sold</p>
                      <p className="text-xl">{batch.total_sold}
                        <span className="text-sm text-muted-foreground ml-1">
                          ({Math.round((batch.total_sold / batch.total_items) * 100)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm font-medium">Total Cost</p>
                      <p className="text-xl">{formatCurrency(batch.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Revenue</p>
                      <p className="text-xl">{formatCurrency(batch.total_revenue)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profit</p>
                    <p className={`text-xl ${batch.total_revenue - batch.total_cost > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      }`}>
                      {formatCurrency(batch.total_revenue - batch.total_cost)}
                      <span className="text-sm ml-1">
                        ({Math.round(((batch.total_revenue - batch.total_cost) / batch.total_cost) * 100)}%)
                      </span>
                    </p>
                  </div>
                </div>
                {batch.description && (
                  <div className="mt-4 border-t pt-2">
                    <p className="text-sm line-clamp-2">{batch.description}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between p-4 pt-0">
                <Link href={`/batches/${batch.id}`} passHref>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
                <Link href={`/items?batch=${batch.id}`} passHref>
                  <Button variant="secondary" size="sm">View Items</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex justify-center p-8">
            <p className="text-muted-foreground">No batches found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
