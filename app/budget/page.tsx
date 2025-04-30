"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertCircle, ArrowUpCircle, ArrowDownCircle, DollarSign, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { LoadingIndicator } from "@/components/ui/loading-indicator"

export default function BudgetPage() {
    const [budget, setBudget] = useState<any>(null)
    const [topUpAmount, setTopUpAmount] = useState("")
    const [topUpDescription, setTopUpDescription] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState("")
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()

    // Fetch budget data
    useEffect(() => {
        async function fetchBudget() {
            if (!user) {
                router.push('/auth/login')
                return
            }

            try {
                const response = await fetch("/api/budget?includeTransactions=true", {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Failed to fetch budget data")
                }

                const result = await response.json()
                if (result.status === 'success' && result.data) {
                    setBudget(result.data)
                } else {
                    throw new Error(result.message || "Failed to fetch budget data")
                }
            } catch (error: any) {
                console.error("Error fetching budget:", error)
                setError(error.message || "Failed to load budget information")
                if (error.message.includes('Unauthorized')) {
                    router.push('/auth/login')
                }
            } finally {
                setInitialLoading(false)
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

            if (isNaN(amount) || amount === 0) {
                setError("Please enter a valid amount")
                return
            }

            const response = await fetch("/api/budget", {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount,
                    description: topUpDescription || "Budget adjustment"
                }),
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.message || "Failed to adjust budget")
            }

            const result = await response.json()

            if (result.status === 'success' && result.data) {
                // Update local budget state with the new values
                setBudget({
                    ...budget,
                    current_budget: result.data.updated_budget,
                    statistics: {
                        ...budget.statistics,
                        total_top_ups: (parseFloat(budget.statistics?.total_top_ups || 0) + amount).toString(),
                        top_up_count: (parseInt(budget.statistics?.top_up_count || 0) + 1).toString(),
                    },
                    transactions: [result.data.transaction, ...(budget.transactions || [])]
                })

                // Reset form
                setTopUpAmount("")
                setTopUpDescription("")

                toast.success("Budget adjusted successfully")
            } else {
                throw new Error(result.message || "Failed to adjust budget")
            }
        } catch (error: any) {
            console.error("Error adjusting budget:", error)
            setError(error.message || "Failed to adjust budget")
            toast.error("Failed to adjust budget")
            if (error.message.includes('Unauthorized')) {
                router.push('/auth/login')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle transaction deletion
    async function handleDeleteTransaction(transactionId: string) {
        try {
            const response = await fetch(`/api/budget/transaction?id=${transactionId}`, {
                method: "DELETE",
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.message || "Failed to delete transaction")
            }

            const result = await response.json()
            if (result.status === 'success' && result.data) {
                // Update local state
                setBudget({
                    ...budget,
                    transactions: budget.transactions.filter((t: any) => t.id !== transactionId)
                })

                toast.success("Transaction deleted successfully")
            } else {
                throw new Error(result.message || "Failed to delete transaction")
            }
        } catch (error: any) {
            console.error("Error deleting transaction:", error)
            toast.error("Failed to delete transaction")
        }
    }

    // Loading state
    if (authLoading || initialLoading || !budget) {
        return (
            <LoadingIndicator fullPage />
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
        <>
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
                                        {budget && budget.current_budget !== undefined ? 
                                            `Rp ${budget.current_budget.toLocaleString()}` : 
                                            <LoadingIndicator />}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {budget && budget.budget_updated_at ? 
                                            `Last updated: ${new Date(budget.budget_updated_at).toLocaleString()}` : 
                                            <LoadingIndicator />}
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
                                                {budget && budget.statistics ? 
                                                    `Rp ${parseFloat(budget.statistics.total_top_ups || 0).toLocaleString()}` : 
                                                    <LoadingIndicator />}
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
                                                {budget && budget.statistics ? 
                                                    `Rp ${Math.abs(parseFloat(budget.statistics.total_batch_purchases || 0)).toLocaleString()}` : 
                                                    <LoadingIndicator />}
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
                                                {budget && budget.statistics ? 
                                                    `Rp ${Math.abs(parseFloat(budget.statistics.total_operational_costs || 0)).toLocaleString()}` : 
                                                    <LoadingIndicator />}
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
                                                {budget && budget.statistics ? 
                                                    `Rp ${parseFloat(budget.statistics.total_sales || 0).toLocaleString()}` : 
                                                    <LoadingIndicator />}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Top-up Transactions</p>
                                        <p className="text-lg font-medium">
                                            {budget && budget.statistics ? budget.statistics.top_up_count || 0 : <LoadingIndicator />}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Batch Purchases</p>
                                        <p className="text-lg font-medium">
                                            {budget && budget.statistics ? budget.statistics.batch_purchase_count || 0 : <LoadingIndicator />}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Operational Costs</p>
                                        <p className="text-lg font-medium">
                                            {budget && budget.statistics ? budget.statistics.operational_cost_count || 0 : <LoadingIndicator />}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Items Sold</p>
                                        <p className="text-lg font-medium">
                                            {budget && budget.statistics ? budget.statistics.item_sale_count || 0 : <LoadingIndicator />}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Budget Management Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Adjust Budget</CardTitle>
                            <CardDescription>
                                Add or deduct funds from your budget
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
                                        <p className="text-sm text-muted-foreground">
                                            Enter a positive number to add funds, negative to deduct
                                        </p>
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
                                        {isSubmitting ? "Processing..." : "Adjust Budget"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start px-6 text-sm text-muted-foreground">
                            <p>Budget adjustments are used for managing your available funds.</p>
                            <p className="mt-1">Your budget will be updated immediately after adjustment.</p>
                        </CardFooter>
                    </Card>
                </div>

                {/* Transaction History */}
                <div className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>
                                Recent budget transactions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {budget?.transactions?.map((transaction: any) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell>
                                                {format(new Date(transaction.created_at), 'PPp')}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`capitalize ${transaction.transaction_type === 'top_up' ? 'text-green-600' :
                                                    transaction.transaction_type === 'batch_purchase' ? 'text-red-600' :
                                                        transaction.transaction_type === 'operational_cost' ? 'text-orange-600' :
                                                            transaction.transaction_type === 'item_sale' ? 'text-blue-600' :
                                                                'text-gray-600'
                                                    }`}>
                                                    {transaction.transaction_type.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell>{transaction.description}</TableCell>
                                            <TableCell className={`text-right ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                Rp {Math.abs(transaction.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    className="hover:bg-transparent hover:text-destructive transition-all duration-200"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!budget?.transactions || budget.transactions.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No transactions found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6">
                    <Button variant="outline" onClick={() => router.push("/batches")}>
                        Back to Batches
                    </Button>
                </div>
            </div>
        </>
    )
}