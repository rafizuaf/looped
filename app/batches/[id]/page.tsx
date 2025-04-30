"use client"

import { useState, useEffect } from "react"
import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useToast } from "@/components/ui/use-toast"
import { BatchHeader } from "./components/batch-header"
import { BatchSummaryCards } from "./components/batch-summary-card"
import { BatchDetailsCard } from "./components/batch-detail-card"
import { ItemsTable } from "./components/items-table"
import { OperationalCostsTable } from "./components/operational-cost-table"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import type { Batch, Item, OperationalCost } from "@/types"
import { LoadingIndicator } from "@/components/ui/loading-indicator"

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [operationalCosts, setOperationalCosts] = useState<OperationalCost[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleteBatchDialogOpen, setIsDeleteBatchDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [costToDelete, setCostToDelete] = useState<string | null>(null)
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
        const soldItems = batchData.items.filter((item: any) => item.sold_status === "sold")
        const actualRevenue = soldItems.reduce((sum: number, item: any) => sum + item.selling_price, 0)
        const actualSold = soldItems.length

        // Update batch data with actual values
        const updatedBatch = {
          ...batchData,
          total_revenue: actualRevenue,
          total_sold: actualSold,
        }

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
          .order("created_at", { ascending: true })

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

  const handleDeleteItem = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from("items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", itemToDelete)

      if (error) throw error

      setItems(items.filter((item) => item.id !== itemToDelete))
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
    } finally {
      setItemToDelete(null)
    }
  }

  const handleDeleteCost = async () => {
    if (!costToDelete) return

    try {
      const { error } = await supabase
        .from("operational_costs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", costToDelete)

      if (error) throw error

      setOperationalCosts(operationalCosts.filter((cost) => cost.id !== costToDelete))
      toast({
        title: "Success",
        description: "Operational cost deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting operational cost:", error)
      toast({
        title: "Error",
        description: "Failed to delete operational cost",
        variant: "destructive",
      })
    } finally {
      setCostToDelete(null)
    }
  }

  const handleDeleteBatch = async () => {
    if (!batch) return

    try {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete batch")
      }

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      })

      // Redirect to batches page
      window.location.href = "/batches"
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete batch",
        variant: "destructive",
      })
    } finally {
      setIsDeleteBatchDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <LoadingIndicator fullPage />
    )
  }

  if (!batch) {
    notFound()
  }

  // Calculate financial metrics
  const totalOperationalCosts = operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
  const totalProfit = batch.total_revenue - batch.total_cost - totalOperationalCosts
  const profitPercentage = (totalProfit / (batch.total_cost + totalOperationalCosts)) * 100

  return (
    <>
      <div className="container px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <BatchHeader batch={batch} onDeleteClick={() => setIsDeleteBatchDialogOpen(true)} />

        <BatchSummaryCards batch={batch} />

        <BatchDetailsCard
          batch={batch}
          totalOperationalCosts={totalOperationalCosts}
          totalProfit={totalProfit}
          profitPercentage={profitPercentage}
        />

        <ItemsTable
          items={items}
          batchId={batch.id}
          totalOperationalCosts={totalOperationalCosts}
          onDeleteItem={(itemId) => setItemToDelete(itemId)}
        />

        <OperationalCostsTable
          costs={operationalCosts}
          batchId={batch.id}
          onDeleteCost={(costId) => setCostToDelete(costId)}
        />

        {/* Batch Delete Confirmation */}
        <DeleteConfirmationDialog
          isOpen={isDeleteBatchDialogOpen}
          onOpenChange={setIsDeleteBatchDialogOpen}
          onConfirm={handleDeleteBatch}
          title="Are you sure?"
          description="This action will soft delete the batch and all its related items and operational costs. This action cannot be undone."
          confirmLabel="Delete Batch"
        />

        {/* Item Delete Confirmation */}
        <DeleteConfirmationDialog
          isOpen={!!itemToDelete}
          onOpenChange={(open) => !open && setItemToDelete(null)}
          onConfirm={handleDeleteItem}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
        />

        {/* Operational Cost Delete Confirmation */}
        <DeleteConfirmationDialog
          isOpen={!!costToDelete}
          onOpenChange={(open) => !open && setCostToDelete(null)}
          onConfirm={handleDeleteCost}
          title="Delete Operational Cost"
          description="Are you sure you want to delete this operational cost? This action cannot be undone."
        />
      </div>
    </>
  )
}