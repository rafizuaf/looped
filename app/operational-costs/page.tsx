"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Plus, Edit, Trash2, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { useAuth } from "@/components/providers/auth-provider"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingIndicator } from "@/components/ui/loading-indicator"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

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

const COST_CATEGORIES = [
  "all",
  "general",
  "equipment",
  "props",
  "rent",
  "utilities",
  "marketing",
  "transportation",
  "other"
]

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

export default function OperationalCostsPage() {
  const [costs, setCosts] = useState<OperationalCost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [costToDelete, setCostToDelete] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchCosts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory])

  async function fetchCosts() {
    try {
      const url = new URL("/api/operational-costs", window.location.origin)
      if (selectedCategory !== "all") {
        url.searchParams.append("category", selectedCategory)
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.status === 'error') {
        throw new Error(result.message)
      }

      setCosts(result.data)
    } catch (error) {
      console.error("Error fetching costs:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load operational costs")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteCost(costId: string) {
    try {
      const response = await fetch(`/api/operational-costs?id=${costId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.status === 'error') {
        throw new Error(result.message)
      }

      toast.success(result.message)
      fetchCosts()
    } catch (error) {
      console.error("Error deleting cost:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete cost")
    }
  }

  if (isLoading) {
    return (
      <LoadingIndicator fullPage />
    )
  }

  return (
    <>
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (costToDelete) {
            handleDeleteCost(costToDelete)
            setCostToDelete(null)
          }
        }}
        title="Delete Operational Cost"
        description="Are you sure you want to delete this operational cost? This action cannot be undone."
      />
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Operational Costs</CardTitle>
              <CardDescription>Manage your operational costs and expenses</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : capitalizeFirstLetter(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full sm:w-auto" variant="outline" asChild>
                <Link href="/operational-costs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {costs.length > 0 ? (
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
                        <TableHead className="whitespace-nowrap">Batch</TableHead>
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
                            {cost.batch_id ? (
                              <Link 
                                href={`/batches/${cost.batch_id}`}
                                className="text-primary hover:underline"
                              >
                                {cost.batch?.name || "Loading..."}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Standalone</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/operational-costs/${cost.id}/edit`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setCostToDelete(cost.id)
                                  setDeleteDialogOpen(true)
                                }}
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
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<DollarSign className="h-12 w-12" />}
              title="No operational costs yet"
              description="Add operational costs to track your business expenses."
              action={
                <Button asChild>
                  <Link href="/operational-costs/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Cost
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  )
} 