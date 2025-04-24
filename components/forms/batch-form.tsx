"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Plus, Upload, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
    })
  ),
  items: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, { message: "Item name is required" }),
      category: z.string().min(1, { message: "Category is required" }),
      purchase_price: z.string().min(1, { message: "Purchase price is required" }),
      selling_price: z.string().min(1, { message: "Selling price is required" }),
      sold_status: z.string().default("unsold"),
      image: z.any().optional(),
    })
  ),
})

type FormValues = z.infer<typeof formSchema>

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
    purchase_date: initialData?.purchase_date || new Date().toISOString().split("T")[0],
    operational_costs: initialData?.operational_costs || [
      { name: "", amount: "" },
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

        const data = await response.json()
        setCurrentBudget(data.current_budget)
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
  // Check if we have enough budget
  const hasEnoughBudget = currentBudget === null ? true : currentBudget >= totalEstimatedCost

  const addOperationalCost = () => {
    form.setValue("operational_costs", [
      ...operational_costs,
      { name: "", amount: "" },
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
            total_sold: 0, // New batch starts with 0 sold
            total_revenue: 0, // New batch starts with 0 revenue
            user_id: user.id,
          }),
        })

        const batchResult = await batchResponse.json()

        if (!batchResponse.ok) {
          if (batchResult.type === "INSUFFICIENT_BUDGET") {
            setBudgetError(batchResult.error || "Insufficient budget for this purchase")
            return
          }
          throw new Error("Failed to create batch")
        }

        const batch = batchResult

        // Create items with user_id and calculated margin values
        for (const item of values.items) {
          const purchasePrice = parseFloat(item.purchase_price);
          const sellingPrice = parseFloat(item.selling_price);
          const marginValue = sellingPrice - purchasePrice;
          const marginPercentage = (marginValue / purchasePrice) * 100;

          const formData = new FormData()
          formData.append("batch_id", batch.id)
          formData.append("name", item.name)
          formData.append("category", item.category)
          formData.append("purchase_price", item.purchase_price)
          formData.append("selling_price", item.selling_price)
          formData.append("margin_percentage", marginPercentage.toString())
          formData.append("margin_value", marginValue.toString())
          formData.append("sold_status", item.sold_status || "unsold") // New items start as unsold
          formData.append("total_cost", item.purchase_price) // For single items, total_cost equals purchase_price
          formData.append("user_id", user.id)

          if (item.image) {
            formData.append("image", item.image)
          }

          const itemResponse = await fetch("/api/items", {
            method: "POST",
            body: formData,
          })

          if (!itemResponse.ok) throw new Error("Failed to create item")
        }

        // Create operational costs with user_id
        for (const cost of values.operational_costs) {
          const costResponse = await fetch("/api/operational-costs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batch_id: batch.id,
              name: cost.name,
              amount: parseFloat(cost.amount),
              date: values.purchase_date,
              user_id: user.id,
            }),
          })

          if (!costResponse.ok) {
            const costResult = await costResponse.json()
            if (costResult.type === "INSUFFICIENT_BUDGET") {
              setBudgetError(costResult.error || "Insufficient budget for operational costs")
              return
            }
            throw new Error("Failed to create operational cost")
          }
        }

        toast.success("Batch created successfully")
        router.push("/batches")
      } else {
        // Update batch
        const batchResponse = await fetch(`/api/batches/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            description: values.description,
            purchase_date: values.purchase_date,
            total_items: values.items.length,
            total_cost: totalCost,
            user_id: user.id,
          }),
        })

        if (!batchResponse.ok) throw new Error("Failed to update batch")

        // Update items
        for (const item of values.items) {
          const purchasePrice = parseFloat(item.purchase_price);
          const sellingPrice = parseFloat(item.selling_price);
          const marginValue = sellingPrice - purchasePrice;
          const marginPercentage = (marginValue / purchasePrice) * 100;

          const formData = new FormData()
          formData.append("id", item.id || "")
          formData.append("batch_id", initialData.id)
          formData.append("name", item.name)
          formData.append("category", item.category)
          formData.append("purchase_price", item.purchase_price)
          formData.append("selling_price", item.selling_price)
          formData.append("margin_percentage", marginPercentage.toString())
          formData.append("margin_value", marginValue.toString())
          formData.append("sold_status", item.sold_status || "unsold")
          formData.append("total_cost", item.purchase_price)
          formData.append("user_id", user.id)

          if (item.image) {
            formData.append("image", item.image)
          }

          const itemResponse = await fetch("/api/items", {
            method: item.id ? "PUT" : "POST",
            body: formData,
          })

          if (!itemResponse.ok) throw new Error("Failed to update item")
        }

        // Update operational costs
        for (const cost of values.operational_costs) {
          const costResponse = await fetch("/api/operational-costs", {
            method: cost.id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: cost.id,
              batch_id: initialData.id,
              name: cost.name,
              amount: parseFloat(cost.amount),
              date: values.purchase_date,
              user_id: user.id,
            }),
          })

          if (!costResponse.ok) throw new Error("Failed to update operational cost")
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
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Loading your account information...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              You must be logged in to create a batch. Please log in first.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4"
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
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add New Batch" : "Edit Batch"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Create a new batch of thrift items for your inventory"
            : "Update your batch information"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Budget Information */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Current Budget</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/budget")}
            >
              Manage Budget
            </Button>
          </div>

          {isLoadingBudget ? (
            <p className="text-muted-foreground">Loading budget information...</p>
          ) : currentBudget !== null ? (
            <div>
              <div className="flex justify-between items-center">
                <span>Available funds:</span>
                <span className={`font-semibold ${currentBudget < totalEstimatedCost ? 'text-destructive' : 'text-primary'}`}>
                  Rp {currentBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Estimated cost:</span>
                <span className="font-semibold">
                  Rp {totalEstimatedCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Remaining after purchase:</span>
                <span className={`font-semibold ${(currentBudget - totalEstimatedCost) < 0 ? 'text-destructive' : 'text-primary'}`}>
                  Rp {(currentBudget - totalEstimatedCost).toLocaleString()}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Operational Costs</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOperationalCost}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost
                </Button>
              </div>

              {operational_costs.map((_, index) => (
                <div key={index} className="flex gap-4 items-start mb-4">
                  <FormField
                    control={form.control}
                    name={`operational_costs.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Cost Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Transportation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`operational_costs.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Amount (Rp)</FormLabel>
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
                      className="mt-8"
                      onClick={() => removeOperationalCost(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.map((_, index) => (
                <div key={index} className="p-4 border rounded-md mb-4">
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
                  <div className="grid gap-4 md:grid-cols-2">
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
                            <div className="flex items-center gap-4">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    onChange(file)
                                  }
                                }}
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