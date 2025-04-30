"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingIndicator } from "../ui/loading-indicator"

// Schema aligned with Supabase database
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Cost name must be at least 3 characters.",
  }),
  amount: z.string().min(1, {
    message: "Amount is required.",
  }),
  date: z.string().min(1, {
    message: "Please select a date.",
  }),
  category: z.string().min(1, {
    message: "Category is required.",
  }),
})

type FormValues = z.infer<typeof formSchema>

interface OperationalCostFormProps {
  mode?: "create" | "edit"
  initialData?: any
}

export const COST_CATEGORIES = [
  "general",
  "equipment",
  "props",
  "rent",
  "utilities",
  "marketing",
  "transportation",
  "other"
]

export function OperationalCostForm({ mode = "create", initialData }: OperationalCostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentBudget, setCurrentBudget] = useState<number | null>(null)
  
  const [isLoadingBudget, setIsLoadingBudget] = useState(false)
  const [budgetError, setBudgetError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batch")
  const { user, isLoading } = useAuth()
  
  // Default values aligned with the Supabase schema field names
  const defaultValues: FormValues = {
    name: initialData?.name || "",
    amount: initialData?.amount?.toString() || "",
    date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    category: initialData?.category || "general",
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset(defaultValues)
    }
  }, [initialData, form])
  
  // Fetch user's budget when component mounts
  useEffect(() => {
    async function fetchBudget() {
      if (!user) return
      
      setIsLoadingBudget(true)
      try {
        const response = await fetch("/api/budget")
        if (!response.ok) throw new Error("Failed to fetch budget")
          
        const result = await response.json()
        
        setCurrentBudget(result.data.current_budget)
      } catch (error) {
        console.error("Error fetching budget:", error)
      } finally {
        setIsLoadingBudget(false)
      }
    }
    
    fetchBudget()
  }, [user])
  
  // Calculate total estimated cost
  const amount = form.watch("amount")
  const totalEstimatedCost = parseFloat(amount || "0")
  const currentCostAmount = mode === "edit" ? initialData?.amount || 0 : 0
  const hasEnoughBudget = currentBudget === null ? true : 
    (currentBudget + currentCostAmount) >= totalEstimatedCost

  // Calculate display values for budget information
  const displayBudget = currentBudget === null ? 0 : currentBudget
  const displayCost = mode === "edit" ? totalEstimatedCost - currentCostAmount : totalEstimatedCost
  const displayRemaining = displayBudget - displayCost
  const isSaving = displayCost < 0
  const isIncreasing = displayCost > 0

  async function onSubmit(values: FormValues) {
    try {
      if (!user) {
        toast.error("You must be logged in to create an operational cost")
        router.push("/auth/login")
        return
      }

      setIsSubmitting(true)
      setBudgetError("")

      const costData = {
        name: values.name,
        amount: parseFloat(values.amount),
        date: values.date,
        category: values.category,
        user_id: user.id,
        ...(batchId && { batch_id: batchId }),
      }

      if (mode === "create") {
        const response = await fetch("/api/operational-costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(costData),
        })

        const result = await response.json()

        if (!response.ok) {
          if (result.type === "INSUFFICIENT_BUDGET") {
            setBudgetError(result.error || "Insufficient budget for this cost")
            return
          }
          throw new Error("Failed to create operational cost")
        }

        toast.success("Operational cost created successfully")
        router.push(batchId ? `/batches/${batchId}` : "/operational-costs")
      } else {
        // For updates, we need to check if the new amount is higher than the current amount
        const amountDifference = costData.amount - currentCostAmount
        if (amountDifference > 0 && currentBudget !== null && amountDifference > currentBudget) {
          setBudgetError("Insufficient budget for the increased amount")
          return
        }

        const response = await fetch(`/api/operational-costs/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...costData,
            id: initialData.id,
          }),
        })

        if (!response.ok) throw new Error("Failed to update operational cost")

        toast.success("Operational cost updated successfully")
        router.push(batchId ? `/batches/${batchId}` : "/operational-costs")
      }
    } catch (error) {
      console.error("Error saving operational cost:", error)
      toast.error("Error saving operational cost")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <LoadingIndicator fullPage />
    )
  }

  if (!user) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              You must be logged in to create an operational cost. Please log in first.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => router.push("/auth/login")}
          >
            Log In
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>{mode === "create" ? "New Operational Cost" : "Edit Operational Cost"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new operational cost to your expenses"
            : "Update your operational cost information"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {/* Budget Information */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
            <h3 className="text-lg font-medium">Current Budget</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/budget")}
              className="w-full sm:w-auto"
            >
              Manage Budget
            </Button>
          </div>

          {isLoadingBudget ? (
            <p className="text-muted-foreground">Loading budget information...</p>
          ) : currentBudget !== null ? (
            <div className="text-sm">
              <div className="flex justify-between items-center">
                <span>Available funds:</span>
                <span className={`font-semibold ${displayBudget < displayCost ? 'text-destructive' : 'text-primary'}`}>
                  Rp {displayBudget?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Cost amount:</span>
                <span className={`font-semibold ${isSaving ? 'text-green-600' : isIncreasing ? 'text-destructive' : ''}`}>
                  {isSaving ? '-' : isIncreasing ? '+' : ''}Rp {Math.abs(displayCost)?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Remaining after cost:</span>
                <span className={`font-semibold ${displayRemaining < 0 ? 'text-destructive' : 'text-primary'}`}>
                  Rp {displayRemaining?.toLocaleString()}
                </span>
              </div>

              {!hasEnoughBudget && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Insufficient Budget</AlertTitle>
                  <AlertDescription>
                    You need to top up your budget before proceeding with this cost.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load budget information</p>
          )}
        </div>

        {budgetError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Budget Error</AlertTitle>
            <AlertDescription>{budgetError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Studio Props" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COST_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CardFooter className="p-0 mt-6">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !hasEnoughBudget}
                >
                  {isSubmitting
                    ? (mode === "create" ? "Creating Cost..." : "Updating Cost...")
                    : (mode === "create" ? "Create Cost" : "Update Cost")
                  }
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 