import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const batchId = searchParams.get("batchId")

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Session error' },
                { status: 401 }
            )
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json(
                { error: 'Unauthorized', message: 'No active session' },
                { status: 401 }
            )
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to access operational costs' },
                { status: 401 }
            )
        }

        let query = supabase
            .from("operational_costs")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })

        if (batchId) {
            query = query.eq("batch_id", batchId)
        }

        const { data: costs, error } = await query

        if (error) throw error

        return NextResponse.json(costs)
    } catch (error: any) {
        console.error("Error fetching operational costs:", error)
        return NextResponse.json({ error: "Error fetching operational costs", message: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const data = await request.json()

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Session error' },
                { status: 401 }
            )
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json(
                { error: 'Unauthorized', message: 'No active session' },
                { status: 401 }
            )
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to create operational costs' },
                { status: 401 }
            )
        }

        // Validate required fields
        if (!data.batch_id || !data.name || !data.amount) {
            return NextResponse.json(
                { error: "Missing required fields", message: "Batch ID, name, and amount are required" },
                { status: 400 }
            )
        }

        // Use the budget-aware function for operational costs
        const { data: result, error } = await supabase.rpc(
            'add_operational_cost_with_budget_check',
            {
                p_batch_id: data.batch_id,
                p_name: data.name,
                p_amount: data.amount,
                p_date: data.date || new Date().toISOString(),
                p_user_id: user.id
            }
        )

        if (error) {
            if (error.message.includes("Insufficient budget")) {
                return NextResponse.json({
                    error: error.message,
                    type: "INSUFFICIENT_BUDGET"
                }, { status: 400 })
            }
            throw error
        }

        return NextResponse.json(result.operational_cost)
    } catch (error: any) {
        console.error("Error creating operational cost:", error)
        return NextResponse.json({ error: "Error creating operational cost", message: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const data = await request.json()
        const { id, ...updateData } = data

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Session error' },
                { status: 401 }
            )
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json(
                { error: 'Unauthorized', message: 'No active session' },
                { status: 401 }
            )
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to update operational costs' },
                { status: 401 }
            )
        }

        // Validate required fields
        if (!id || !updateData.name || !updateData.amount) {
            return NextResponse.json(
                { error: "Missing required fields", message: "ID, name, and amount are required" },
                { status: 400 }
            )
        }

        const { data: cost, error } = await supabase
            .from("operational_costs")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(cost)
    } catch (error: any) {
        console.error("Error updating operational cost:", error)
        return NextResponse.json({ error: "Error updating operational cost", message: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        // First ensure we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Session error' },
                { status: 401 }
            )
        }

        if (!session) {
            console.error('No session found')
            return NextResponse.json(
                { error: 'Unauthorized', message: 'No active session' },
                { status: 401 }
            )
        }

        // Now get the user from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            console.error('User error:', userError)
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to delete operational costs' },
                { status: 401 }
            )
        }

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 })
        }

        const { data: cost, error } = await supabase
            .from("operational_costs")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(cost)
    } catch (error: any) {
        console.error("Error deleting operational cost:", error)
        return NextResponse.json({ error: "Error deleting operational cost", message: error.message }, { status: 500 })
    }
}