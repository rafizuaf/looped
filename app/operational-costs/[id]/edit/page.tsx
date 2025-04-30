"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { OperationalCostForm } from "@/components/forms/operational-cost-form"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { LoadingIndicator } from "@/components/ui/loading-indicator"
import Link from "next/link"

interface OperationalCost {
  id: string
  name: string
  category: string
  amount: number
  date: string
  batch_id?: string
  user_id: string
  created_at: string
  deleted_at?: string
  batch?: {
    id: string
    name: string
  }
}

export default function EditOperationalCostPage({ params }: { params: { id: string } }) {
  const [cost, setCost] = useState<OperationalCost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchCost() {
      try {
        const response = await fetch(`/api/operational-costs/${params.id}`)
        const result = await response.json()

        if (result.status === 'error') {
          throw new Error(result.message)
        }

        setCost(result.data)
      } catch (error) {
        console.error("Error fetching cost:", error)
        toast.error(error instanceof Error ? error.message : "Failed to load operational cost")
        router.push("/operational-costs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCost()
  }, [params.id, router, toast])

  if (isLoading) {
    return (
      <LoadingIndicator fullPage />
    )
  }

  if (!cost) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Operational cost not found
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {cost.batch_id && cost.batch && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Batch</h3>
                <Link 
                  href={`/batches/${cost.batch_id}`}
                  className="text-primary hover:underline"
                >
                  {cost.batch.name}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <OperationalCostForm mode="edit" initialData={cost} />
    </div>
  )
} 