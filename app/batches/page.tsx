"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { LoadingIndicator } from "@/components/ui/loading-indicator"

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

  async function handleDeleteBatch(batchId: string) {
    if (!confirm("Are you sure you want to delete this batch?")) return

    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete batch")

      toast.success("Batch deleted successfully")
      // Refresh the page to update the list
      window.location.reload()
    } catch (error) {
      console.error("Error deleting batch:", error)
      toast.error("Failed to delete batch")
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
      <LoadingIndicator fullPage />
    )
  }

  return (
    <>
      {/* Responsive Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Batches</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your thrift shop batches
        </p>
      </div>

      {/* Responsive Search & Action Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center mt-4 md:mt-6">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Link href="/batches/new" passHref className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Batch
          </Button>
        </Link>
      </div>

      {/* Responsive Card Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4 md:mt-6">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden transition-all hover:shadow-md h-full flex flex-col">
              <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <CardTitle className="text-lg md:text-xl truncate">{batch.name}</CardTitle>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {new Date(batch.purchase_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="text-red-500 hover:text-red-700 -mr-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-1 md:pt-2 flex-grow">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs md:text-sm font-medium">Items</p>
                      <p className="text-base md:text-lg">{batch.total_items}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium">Sold</p>
                      <p className="text-base md:text-lg">{batch.total_sold}
                        <span className="text-xs md:text-sm text-muted-foreground ml-1">
                          ({Math.round((batch.total_sold / batch.total_items) * 100)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs md:text-sm font-medium">Total Cost</p>
                      <p className="text-base md:text-lg truncate">{formatCurrency(batch.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium">Revenue</p>
                      <p className="text-base md:text-lg truncate">{formatCurrency(batch.total_revenue)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium">Profit</p>
                    <p className={`text-base md:text-lg ${batch.total_revenue - batch.total_cost > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                      }`}>
                      {formatCurrency(batch.total_revenue - batch.total_cost)}
                      <span className="text-xs md:text-sm ml-1">
                        ({Math.round(((batch.total_revenue - batch.total_cost) / batch.total_cost) * 100)}%)
                      </span>
                    </p>
                  </div>
                </div>
                {batch.description && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs md:text-sm line-clamp-2">{batch.description}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 p-3 md:p-4 pt-0 mt-auto">
                <Link href={`/batches/${batch.id}`} passHref className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs md:text-sm">View Details</Button>
                </Link>
                <Link href={`/items?batch=${batch.id}`} passHref className="w-full">
                  <Button variant="secondary" size="sm" className="w-full text-xs md:text-sm">View Items</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex justify-center p-6 md:p-8">
            <p className="text-muted-foreground">No batches found</p>
          </div>
        )}
      </div>
    </>
  )
}