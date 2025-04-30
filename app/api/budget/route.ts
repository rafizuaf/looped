import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/budget
 * Returns the current budget and summary for the authenticated user
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const includeTransactions = searchParams.get("includeTransactions") === "true"

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json({
                status: 'error',
                message: 'Session error',
                data: null
            }, { status: 401 })
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json({
                status: 'error',
                message: 'No active session',
                data: null
            }, { status: 401 })
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json({
                status: 'error',
                message: 'You must be logged in to access your budget',
                data: null
            }, { status: 401 })
        }

        // Get budget summary
        const { data: budgetSummary, error: budgetError } = await supabase.rpc(
            'get_budget_summary',
            { p_user_id: user.id }
        )

        if (budgetError) throw budgetError

        // If transactions are requested, get them
        let transactions = null
        if (includeTransactions) {
            const { data: transactionData, error: transactionError } = await supabase
                .from('budget_transactions')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (transactionError) throw transactionError
            transactions = transactionData
        }

        return NextResponse.json({
            status: 'success',
            message: 'Budget retrieved successfully',
            data: {
                ...budgetSummary,
                transactions
            }
        })
    } catch (error: any) {
        console.error("Error fetching budget:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error fetching budget',
            data: null
        }, { status: 500 })
    }
}

/**
 * POST /api/budget
 * Tops up the user's budget with the specified amount
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const data = await request.json()

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json({
                status: 'error',
                message: 'Session error',
                data: null
            }, { status: 401 })
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json({
                status: 'error',
                message: 'No active session',
                data: null
            }, { status: 401 })
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json({
                status: 'error',
                message: 'You must be logged in to manage your budget',
                data: null
            }, { status: 401 })
        }

        // Validate required fields
        if (!data.amount || typeof data.amount !== 'number') {
            return NextResponse.json({
                status: 'error',
                message: 'Amount must be a number',
                data: null
            }, { status: 400 })
        }

        // Validate amount is not zero
        if (data.amount === 0) {
            return NextResponse.json({
                status: 'error',
                message: 'Amount cannot be zero',
                data: null
            }, { status: 400 })
        }

        // Use the budget transaction function
        const { data: result, error } = await supabase.rpc(
            'create_budget_transaction',
            {
                p_user_id: user.id,
                p_amount: data.amount,
                p_transaction_type: data.amount > 0 ? 'top_up' : 'other',
                p_description: data.description || (data.amount > 0 ? 'Budget top-up' : 'Budget adjustment'),
                p_reference_id: null
            }
        )

        if (error) {
            if (error.message.includes("Insufficient budget")) {
                return NextResponse.json({
                    status: 'error',
                    message: error.message,
                    type: "INSUFFICIENT_BUDGET",
                    data: null
                }, { status: 400 })
            }
            throw error
        }

        return NextResponse.json({
            status: 'success',
            message: 'Budget transaction created successfully',
            data: result
        })
    } catch (error: any) {
        console.error("Error managing budget:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error managing budget',
            data: null
        }, { status: 500 })
    }
}

// DELETE /api/budget/transaction
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const transactionId = searchParams.get("id")

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json({
                status: 'error',
                message: 'Session error',
                data: null
            }, { status: 401 })
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json({
                status: 'error',
                message: 'No active session',
                data: null
            }, { status: 401 })
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json({
                status: 'error',
                message: 'You must be logged in to manage your budget',
                data: null
            }, { status: 401 })
        }

        if (!transactionId) {
            return NextResponse.json({
                status: 'error',
                message: 'Transaction ID is required',
                data: null
            }, { status: 400 })
        }

        // Soft delete the transaction
        const { data: transaction, error } = await supabase
            .from('budget_transactions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', transactionId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            status: 'success',
            message: 'Budget transaction deleted successfully',
            data: transaction
        })
    } catch (error: any) {
        console.error("Error deleting budget transaction:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error deleting budget transaction',
            data: null
        }, { status: 500 })
    }
}