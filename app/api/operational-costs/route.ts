import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

// GET /api/operational-costs
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const batchId = searchParams.get("batchId")

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
                message: 'You must be logged in to access operational costs',
                data: null
            }, { status: 401 })
        }

        let query = supabase
            .from("operational_costs")
            .select(`
                *,
                batch:batches(id, name)
            `)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })

        if (batchId) {
            query = query.eq("batch_id", batchId)
        }

        const { data: costs, error } = await query

        if (error) throw error

        return NextResponse.json({
            status: 'success',
            message: 'Operational costs retrieved successfully',
            data: costs
        })
    } catch (error: any) {
        console.error("Error fetching operational costs:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error fetching operational costs',
            data: null
        }, { status: 500 })
    }
}

// POST /api/operational-costs
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
                message: 'You must be logged in to create operational costs',
                data: null
            }, { status: 401 })
        }

        // Validate required fields
        if (!data.name || !data.amount) {
            return NextResponse.json({
                status: 'error',
                message: 'Name and amount are required',
                data: null
            }, { status: 400 })
        }

        // Validate amount is positive
        if (data.amount <= 0) {
            return NextResponse.json({
                status: 'error',
                message: 'Amount must be positive',
                data: null
            }, { status: 400 })
        }

        // Use the budget-aware function for operational costs
        const { data: result, error } = await supabase.rpc(
            'add_operational_cost_with_budget_check',
            {
                p_name: data.name,
                p_amount: data.amount,
                p_date: data.date || new Date().toISOString(),
                p_user_id: user.id,
                p_batch_id: data.batch_id || null,
                p_category: data.category || 'general'
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
            message: 'Operational cost created successfully',
            data: result.operational_cost
        })
    } catch (error: any) {
        console.error("Error creating operational cost:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error creating operational cost',
            data: null
        }, { status: 500 })
    }
}

// PUT /api/operational-costs
export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const data = await request.json()
        const { id, ...updateData } = data

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
                message: 'You must be logged in to update operational costs',
                data: null
            }, { status: 401 })
        }

        // Validate required fields
        if (!id || !updateData.name || !updateData.amount) {
            return NextResponse.json({
                status: 'error',
                message: 'ID, name, and amount are required',
                data: null
            }, { status: 400 })
        }

        // Validate amount is positive
        if (updateData.amount <= 0) {
            return NextResponse.json({
                status: 'error',
                message: 'Amount must be positive',
                data: null
            }, { status: 400 })
        }

        const { data: cost, error } = await supabase
            .from("operational_costs")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            status: 'success',
            message: 'Operational cost updated successfully',
            data: cost
        })
    } catch (error: any) {
        console.error("Error updating operational cost:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error updating operational cost',
            data: null
        }, { status: 500 })
    }
}

// DELETE /api/operational-costs
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

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
                message: 'You must be logged in to delete operational costs',
                data: null
            }, { status: 401 })
        }

        if (!id) {
            return NextResponse.json({
                status: 'error',
                message: 'Operational cost ID is required',
                data: null
            }, { status: 400 })
        }

        // Start a transaction to ensure data consistency
        const { data: cost, error: costError } = await supabase
            .from("operational_costs")
            .select('amount, user_id')
            .eq("id", id)
            .single()

        if (costError) {
            throw new Error('Failed to fetch operational cost')
        }

        // Create a compensating budget transaction to restore the amount
        const { error: budgetError } = await supabase.rpc(
            'create_budget_transaction',
            {
                p_user_id: user.id,
                p_amount: cost.amount, // Positive amount to restore the budget
                p_transaction_type: 'operational_cost_refund',
                p_description: 'Refund for deleted operational cost',
                p_reference_id: id
            }
        )

        if (budgetError) {
            throw new Error('Failed to create budget refund transaction')
        }

        // Mark the operational cost as deleted
        const { data: deletedCost, error: deleteError } = await supabase
            .from("operational_costs")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

        if (deleteError) throw deleteError

        return NextResponse.json({
            status: 'success',
            message: 'Operational cost deleted successfully and budget restored',
            data: deletedCost
        })
    } catch (error: any) {
        console.error("Error deleting operational cost:", error)
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Error deleting operational cost',
            data: null
        }, { status: 500 })
    }
}