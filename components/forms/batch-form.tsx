"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Plus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { LoadingIndicator } from "../ui/loading-indicator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from '@/lib/supabase/client'
import { Item, OperationalCost } from "@/types"

interface OperationalCostFormData {
  id?: string
  name: string
  amount: string
  category: string
}

// Schema aligned with Supabase database
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Batch name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  purchase_date: z.string().min(1, {
    message: "Please select a date.",
  }),
  operational_costs: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, { message: "Cost name is required" }),
      amount: z.string().min(1, { message: "Amount is required" }),
      category: z.string().min(1, { message: "Category is required" }),
    })
  ),
  items: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, { message: "Item name is required" }),
      category: z.string().min(1, { message: "Category is required" }),
      purchase_price: z.string().min(1, { message: "Purchase price is required" }),
      selling_price: z.string().min(1, { message: "Selling price is required" }),
      sold_status: z.enum(['sold', 'unsold']).default("unsold"),
      image: z.any().optional(),
      image_url: z.string().nullable().optional(),
    })
  ),
})

const COST_CATEGORIES = [
  "general",
  "equipment",
  "props",
  "rent",
  "utilities",
  "marketing",
  "transportation",
  "other"
]

type FormValues = z.infer<typeof formSchema>

interface BatchFormData {
  name: string
  description: string
  items: Item[]
  operational_costs: {
    name: string
    amount: string
  }[]
  total_operational_costs: string
  total_investment: string
  total_revenue: string
  total_profit: string
  profit_margin: string
  roi: string
  status: string
  image?: File
  image_url?: string
}

interface BatchFormProps {
  mode?: "create" | "edit"
  initialData?: any
}

export function BatchForm({ mode = "create", initialData }: BatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentBudget, setCurrentBudget] = useState<number | null>(null)
  const [isLoadingBudget, setIsLoadingBudget] = useState(false)
  const [budgetError, setBudgetError] = useState("")
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Default values aligned with the Supabase schema field names
  const defaultValues: FormValues = {
    name: initialData?.name || "",
    description: initialData?.description || "",
    purchase_date: initialData?.purchase_date 
      ? new Date(initialData.purchase_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    operational_costs: initialData?.operational_costs?.map((cost: OperationalCost) => ({
      id: cost.id,
      name: cost.name,
      amount: cost.amount.toString(),
      category: cost.category || "general"
    })) || [
      { name: "", amount: "", category: "general" },
    ],
    items: initialData?.items || [
      { name: "", category: "", purchase_price: "", selling_price: "", image: null },
    ],
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        purchase_date: new Date(initialData.purchase_date).toISOString().split('T')[0],
        operational_costs: initialData.operational_costs?.map((cost: OperationalCost) => ({
          id: cost.id,
          name: cost.name,
          amount: cost.amount.toString(),
          category: cost.category || "general"
        })) || [
          { name: "", amount: "", category: "general" },
        ],
        items: initialData.items || [
          { name: "", category: "", purchase_price: "", selling_price: "", image: null },
        ],
      })
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

  const operational_costs = form.watch("operational_costs")
  const items = form.watch("items")

  // Calculate total estimated cost
  const calculateTotalCost = () => {
    const itemsCost = items.reduce((sum, item) =>
      sum + parseFloat(item.purchase_price || "0"), 0)

    const opCost = operational_costs.reduce((sum, cost) =>
      sum + parseFloat(cost.amount || "0"), 0)

    return itemsCost + opCost
  }

  const totalEstimatedCost = calculateTotalCost()
  
  // Calculate current batch cost for edit mode
  const currentBatchCost = mode === "edit" ? 
    (initialData?.items?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.purchase_price || "0"), 0) || 0) +
    (initialData?.operational_costs?.reduce((sum: number, cost: any) => 
      sum + parseFloat(cost.amount || "0"), 0) || 0) 
    : 0

  // Calculate display values for budget information
  const displayBudget = currentBudget === null ? 0 : currentBudget
  const displayCost = mode === "edit" ? totalEstimatedCost - currentBatchCost : totalEstimatedCost
  const displayRemaining = displayBudget - displayCost
  const isSaving = displayCost < 0
  const isIncreasing = displayCost > 0

  // Check if we have enough budget
  const hasEnoughBudget = currentBudget === null ? true : 
    (currentBudget + currentBatchCost) >= totalEstimatedCost

  const addOperationalCost = () => {
    form.setValue("operational_costs", [
      ...operational_costs,
      { name: "", amount: "", category: "general" },
    ])
  }

  const removeOperationalCost = (index: number) => {
    const newCosts = [...operational_costs]
    newCosts.splice(index, 1)
    form.setValue("operational_costs", newCosts)
  }

  const addItem = () => {
    form.setValue("items", [
      ...items,
      { name: "", category: "", purchase_price: "", selling_price: "", sold_status: "unsold", image: null },
    ])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    form.setValue("items", newItems)
  }

  async function onSubmit(values: FormValues) {
    try {
      if (!user) {
        toast.error("You must be logged in to create a batch")
        router.push("/auth/login")
        return
      }

      setIsSubmitting(true)
      setBudgetError("")

      // Calculate total cost from items and operational costs
      const totalItemsCost = values.items.reduce((sum, item) =>
        sum + parseFloat(item.purchase_price || "0"), 0);

      const totalOperationalCost = values.operational_costs.reduce((sum, cost) =>
        sum + parseFloat(cost.amount || "0"), 0);

      const totalCost = totalItemsCost + totalOperationalCost;

      if (mode === "create") {
        // Upload images first if any
        const itemsWithImages = await Promise.all(values.items.map(async (item) => {
          if (item.image) {
            const formData = new FormData()
            formData.append('file', item.image)
            formData.append('bucket', 'item-images')
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('item-images')
              .upload(`${user.id}/${Date.now()}-${item.image.name}`, item.image)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
              .from('item-images')
              .getPublicUrl(uploadData.path)

            return {
              ...item,
              image_url: publicUrl
            }
          }
          return item
        }))

        // Create batch with user_id and calculated totals
        const batchResponse = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            description: values.description,
            purchase_date: values.purchase_date,
            total_items: values.items.length,
            total_cost: totalCost,
            user_id: user.id,
            items: itemsWithImages.map(item => {
              const mappedItem = {
                name: item.name,
                category: item.category,
                purchase_price: item.purchase_price,
                selling_price: item.selling_price,
                sold_status: item.sold_status || "unsold"
              };
              
              if ('image_url' in item && item.image_url) {
                return { ...mappedItem, image_url: item.image_url };
              }
              
              return mappedItem;
            }),
            operational_costs: values.operational_costs.map(cost => ({
              name: cost.name,
              amount: cost.amount,
              category: cost.category || "general"
            }))
          }),
        })

        const batchResult = await batchResponse.json()

        if (!batchResponse.ok) {
          if (batchResult.error?.includes("Insufficient budget")) {
            setBudgetError(batchResult.error || "Insufficient budget for this purchase")
            return
          }
          throw new Error(batchResult.error || "Failed to create batch")
        }

        toast.success("Batch created successfully")
        router.push("/batches")
      } else {
        // Update batch using transaction
        const { data, error } = await supabase.rpc('update_batch_with_transaction', {
          p_batch_id: initialData.id,
          p_name: values.name,
          p_description: values.description,
          p_purchase_date: values.purchase_date,
          p_total_items: values.items.length,
          p_total_cost: totalCost,
          p_user_id: user.id,
          p_items: values.items.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            purchase_price: item.purchase_price,
            selling_price: item.selling_price,
            sold_status: item.sold_status || "unsold"
          })),
          p_operational_costs: values.operational_costs.map(cost => ({
            id: cost.id,
            name: cost.name,
            amount: cost.amount,
            category: cost.category || "general"
          }))
        })

        if (error) {
          if (error.message?.includes("Insufficient budget")) {
            setBudgetError(error.message)
            return
          }
          throw new Error(error.message || "Failed to update batch")
        }

        toast.success("Batch updated successfully")
        router.push(`/batches/${initialData.id}`)
      }
    } catch (error) {
      console.error("Error saving batch:", error)
      toast.error("Error saving batch")
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
              You must be logged in to create a batch. Please log in first.
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
        <CardTitle>{mode === "create" ? "New Batch" : "Edit Batch"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Create a new batch of thrift items for your inventory"
            : "Update your batch information"
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
            <LoadingIndicator  />
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
                    You need to top up your budget before proceeding with this purchase.
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
                    <FormLabel>Batch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Collection 2023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Collection details, sources, etc."
                      {...field}
                      className="resize-y min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h3 className="text-lg font-medium">Operational Costs</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOperationalCost}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost
                </Button>
              </div>

              {operational_costs.map((_, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start mb-4">
                  <FormField
                    control={form.control}
                    name={`operational_costs.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="sm:sr-only">Cost Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Transportation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`operational_costs.${index}.category`}
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="sm:sr-only">Category</FormLabel>
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
                    name={`operational_costs.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="sm:sr-only">Amount (Rp)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-center mt-0 sm:mt-0"
                      onClick={() => removeOperationalCost(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h3 className="text-lg font-medium">Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.map((_, index) => (
                <div key={index} className="p-3 sm:p-4 border rounded-md mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Item #{index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Vintage T-Shirt" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Clothing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.purchase_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price (Rp)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.selling_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (Rp)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="120000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.image`}
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Item Image</FormLabel>
                          <FormControl>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    onChange(file)
                                  }
                                }}
                                className="flex-1 w-full"
                                {...field}
                              />
                              {value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onChange(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <Alert>
                <AlertDescription>
                  Please add at least one item to this batch.
                </AlertDescription>
              </Alert>
            )}

            <CardFooter className="p-0 mt-6">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !hasEnoughBudget}
              >
                {isSubmitting
                  ? (mode === "create" ? "Creating Batch..." : "Updating Batch...")
                  : (mode === "create" ? "Create Batch" : "Update Batch")
                }
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}