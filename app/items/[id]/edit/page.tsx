"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  purchase_price: z.string().min(1, { message: "Purchase price is required" })
    .refine((val) => !isNaN(parseFloat(val)), { message: "Must be a valid number" }),
  selling_price: z.string().min(1, { message: "Selling price is required" })
    .refine((val) => !isNaN(parseFloat(val)), { message: "Must be a valid number" }),
  sold_status: z.enum(["sold", "unsold"], {
    required_error: "Sold status is required",
    invalid_type_error: "Sold status must be either 'sold' or 'unsold'"
  }),
  image: z.any().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function EditItemPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      purchase_price: "",
      selling_price: "",
      sold_status: "unsold",
      image: null,
    },
  })

  useEffect(() => {
    async function loadItem() {
      try {
        const response = await fetch(`/api/items/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch item")

        const item = await response.json()
        form.reset({
          name: item.name,
          category: item.category,
          purchase_price: item.purchase_price.toString(),
          selling_price: item.selling_price.toString(),
          sold_status: item.sold_status,
        })
      } catch (error) {
        toast.error("Error loading item")
      } finally {
        setIsLoading(false)
      }
    }

    loadItem()
  }, [params.id, form])

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)

      // Calculate margin values
      const purchasePrice = parseFloat(values.purchase_price)
      const sellingPrice = parseFloat(values.selling_price)
      const marginValue = sellingPrice - purchasePrice
      const marginPercentage = (marginValue / purchasePrice) * 100

      const formData = new FormData()
      formData.append("name", values.name)
      formData.append("category", values.category)
      formData.append("purchase_price", values.purchase_price)
      formData.append("selling_price", values.selling_price)
      formData.append("margin_percentage", marginPercentage.toString())
      formData.append("margin_value", marginValue.toString())
      formData.append("sold_status", values.sold_status)
      formData.append("total_cost", values.purchase_price) // Total cost is same as purchase price for now
      if (values.image) {
        formData.append("image", values.image)
      }

      const response = await fetch(`/api/items/${params.id}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to update item")

      toast.success("Item updated successfully")
      router.push("/items")
    } catch (error) {
      toast.error("Error updating item")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold">Edit Item</h1>
        <p className="text-muted-foreground">
          Update item details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
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
                name="category"
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchase_price"
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
                  name="selling_price"
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
              </div>

              <FormField
                control={form.control}
                name="sold_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sold Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unsold">Unsold</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Item Image</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating Item..." : "Update Item"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}