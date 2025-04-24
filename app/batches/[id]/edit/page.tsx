"use client"

import { useState, useEffect } from "react"
import { notFound } from "next/navigation"
import { BatchForm } from "@/components/forms/batch-form"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"

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

export default function EditBatchPage({ params }: { params: { id: string } }) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [operationalCosts, setOperationalCosts] = useState<OperationalCost[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchBatchData() {
      if (!user) return

      try {
        // Fetch batch
        const { data: batchData, error: batchError } = await supabase
          .from("batches")
          .select("*")
          .eq("id", params.id)
          .is("deleted_at", null)
          .single()

        if (batchError) throw batchError
        if (!batchData) {
          notFound()
        }

        setBatch(batchData)

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
        toast.error("Failed to load batch data")
      } finally {
        setLoading(false)
      }
    }

    fetchBatchData()
  }, [user, params.id, supabase])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>Loading batch data...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!batch) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        <BatchForm
          mode="edit"
          initialData={{
            ...batch,
            items: items.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category,
              purchase_price: item.purchase_price.toString(),
              selling_price: item.selling_price.toString(),
              sold_status: item.sold_status,
              image: null
            })),
            operational_costs: operationalCosts.map(cost => ({
              id: cost.id,
              name: cost.name,
              amount: cost.amount.toString()
            }))
          }}
        />
      </div>
    </DashboardLayout>
  )
} 