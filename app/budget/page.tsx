"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertCircle, ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function BudgetPage() {
    const [budget, setBudget] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [topUpAmount, setTopUpAmount] = useState("")
    const [topUpDescription, setTopUpDescription] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()

    console.log("is submitting", isSubmitting);
    

    // Fetch budget data
    useEffect(() => {
        async function fetchBudget() {
            if (!user) {
                router.push('/auth/login')
                return
            }

            try {
                setIsLoading(true)
                const response = await fetch("/api/budget", {
                    credentials: 'include', // This is important for sending cookies
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Failed to fetch budget data")
                }

                const data = await response.json()
                setBudget(data)
            } catch (error: any) {
                console.error("Error fetching budget:", error)
                setError(error.message || "Failed to load budget information")
                if (error.message.includes('Unauthorized')) {
                    router.push('/auth/login')
                }
            } finally {
                setIsLoading(false)
            }
        }

        if (user) {
            fetchBudget()
        }
    }, [user, router])

    // Handle top up submission
    async function handleTopUp(e: React.FormEvent) {
        e.preventDefault()

        try {
            setIsSubmitting(true)
            setError("")

            const amount = parseFloat(topUpAmount)

            if (isNaN(amount) || amount <= 0) {
                setError("Please enter a valid positive amount")
                return
            }

            const response = await fetch("/api/budget", {
                method: "POST",
                credentials: 'include', // This is important for sending cookies
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount,
                    description: topUpDescription || "Budget top-up"
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || "Failed to top up budget")
            }

            const result = await response.json()

            // Update local budget state with the new values
            setBudget({
                ...budget,
                current_budget: result.updated_budget,
                statistics: {
                    ...budget.statistics,
                    total_top_ups: (parseFloat(budget.statistics?.total_top_ups || 0) + amount).toString(),
                    top_up_count: (parseInt(budget.statistics?.top_up_count || 0) + 1).toString(),
                }
            })

            // Reset form
            setTopUpAmount("")
            setTopUpDescription("")

            toast.success("Budget topped up successfully")
        } catch (error: any) {
            console.error("Error topping up budget:", error)
            setError(error.message || "Failed to top up budget")
            toast.error("Failed to top up budget")
            if (error.message.includes('Unauthorized')) {
                router.push('/auth/login')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (authLoading || isLoading) {
        return (
            <DashboardLayout>
                <div className="container py-10">
                    <Card>
                        <CardContent className="p-6">
                            <Alert>
                                <AlertDescription>
                                    Loading your budget information...
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="container py-10">
                <Card>
                    <CardContent className="p-6">
                        <Alert variant="destructive">
                            <AlertDescription>
                                You must be logged in to view your budget. Please log in first.
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
            </div>
        )
    }

    return (
        <DashboardLayout>
            <div className="container py-10">
                <h1 className="text-3xl font-bold mb-6">Budget Management</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Budget Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Budget Summary</CardTitle>
                            <CardDescription>
                                Your current budget and transaction history
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="mb-8">
                                <div className="bg-primary/10 p-6 rounded-lg">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Balance</h3>
                                    <p className="text-4xl font-bold">
                                        Rp {budget?.current_budget?.toLocaleString() || '0'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Last updated: {budget?.budget_updated_at ? new Date(budget.budget_updated_at).toLocaleString() : 'Never'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Total Top-ups</p>
                                            <p className="text-lg font-bold">
                                                Rp {parseFloat(budget?.statistics?.total_top_ups || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-red-100 p-2 rounded-full">
                                            <ArrowDownCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Total Purchases</p>
                                            <p className="text-lg font-bold">
                                                Rp {Math.abs(parseFloat(budget?.statistics?.total_batch_purchases || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-orange-100 p-2 rounded-full">
                                            <ArrowDownCircle className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Operational Costs</p>
                                            <p className="text-lg font-bold">
                                                Rp {Math.abs(parseFloat(budget?.statistics?.total_operational_costs || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-100 p-2 rounded-full">
                                            <DollarSign className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Total Sales</p>
                                            <p className="text-lg font-bold">
                                                Rp {parseFloat(budget?.statistics?.total_sales || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Top-up Transactions</p>
                                        <p className="text-lg font-medium">{budget?.statistics?.top_up_count || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Batch Purchases</p>
                                        <p className="text-lg font-medium">{budget?.statistics?.batch_purchase_count || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Operational Costs</p>
                                        <p className="text-lg font-medium">{budget?.statistics?.operational_cost_count || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Items Sold</p>
                                        <p className="text-lg font-medium">{budget?.statistics?.item_sale_count || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Up Form Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Up Budget</CardTitle>
                            <CardDescription>
                                Add funds to your budget to purchase items
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleTopUp}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (Rp)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="50000"
                                            value={topUpAmount}
                                            onChange={(e) => setTopUpAmount(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description (Optional)</Label>
                                        <Input
                                            id="description"
                                            placeholder="Monthly budget allocation"
                                            value={topUpDescription}
                                            onChange={(e) => setTopUpDescription(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting || !topUpAmount}
                                    >
                                        {isSubmitting ? "Processing..." : "Top Up Budget"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start px-6 text-sm text-muted-foreground">
                            <p>Top-ups are used for purchasing new batches and covering operational costs.</p>
                            <p className="mt-1">Your budget will be updated immediately after topping up.</p>
                        </CardFooter>
                    </Card>
                </div>

                <div className="mt-6">
                    <Button variant="outline" onClick={() => router.push("/batches")}>
                        Back to Batches
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    )
}