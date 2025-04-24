import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
        { error: 'Unauthorized', message: 'You must be logged in to access batch details' },
        { status: 401 }
      )
    }

    const { data: batch, error } = await supabase
      .from("batches")
      .select(`
        *,
        items:items(*),
        operational_costs:operational_costs(*)
      `)
      .eq("id", params.id)
      .single()

    if (error) throw error
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

    return NextResponse.json(batch)
  } catch (error: any) {
    console.error("Error fetching batch:", error)
    return NextResponse.json({ error: "Error fetching batch", message: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const json = await request.json()

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
        { error: 'Unauthorized', message: 'You must be logged in to update batches' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!json.name || !json.purchase_date) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Name and purchase date are required" },
        { status: 400 }
      )
    }

    // Start a transaction
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .update({
        name: json.name,
        description: json.description,
        purchase_date: json.purchase_date,
        total_items: json.total_items,
        total_cost: json.total_cost,
        total_sold: json.total_sold,
        total_revenue: json.total_revenue,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single()

    if (batchError) {
      console.error("Error updating batch:", batchError)
      return NextResponse.json(
        { error: "Failed to update batch", message: batchError.message },
        { status: 500 }
      )
    }
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    // Update items
    if (json.items) {
      for (const item of json.items) {
        // Validate item data
        if (!item.name || !item.category || !item.purchase_price || !item.selling_price) {
          return NextResponse.json(
            { error: "Item name, category, purchase price, and selling price are required" },
            { status: 400 }
          )
        }

        const { error: itemError } = await supabase
          .from("items")
          .update({
            name: item.name,
            category: item.category,
            purchase_price: parseFloat(item.purchase_price),
            selling_price: parseFloat(item.selling_price),
            sold_status: item.sold_status || "unsold",
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id)

        if (itemError) {
          console.error("Error updating item:", itemError)
          return NextResponse.json(
            { error: "Failed to update item", message: itemError.message },
            { status: 500 }
          )
        }
      }
    }

    // Update operational costs
    if (json.operational_costs) {
      for (const cost of json.operational_costs) {
        // Validate cost data
        if (!cost.name || !cost.amount) {
          return NextResponse.json(
            { error: "Cost name and amount are required" },
            { status: 400 }
          )
        }

        const { error: costError } = await supabase
          .from("operational_costs")
          .update({
            name: cost.name,
            amount: parseFloat(cost.amount),
            updated_at: new Date().toISOString()
          })
          .eq("id", cost.id)

        if (costError) {
          console.error("Error updating operational cost:", costError)
          return NextResponse.json(
            { error: "Failed to update operational cost", message: costError.message },
            { status: 500 }
          )
        }
      }
    }

    // Fetch updated batch with all related data
    const { data: updatedBatch, error: fetchError } = await supabase
      .from("batches")
      .select(`
        *,
        items:items(*),
        operational_costs:operational_costs(*)
      `)
      .eq("id", params.id)
      .single()

    if (fetchError) {
      console.error("Error fetching updated batch:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch updated batch", message: fetchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedBatch)
  } catch (error: any) {
    console.error("Error in batch update:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
        { error: 'Unauthorized', message: 'You must be logged in to delete batches' },
        { status: 401 }
      )
    }

    // Start a transaction to soft delete batch and related data
    const { data: batch, error } = await supabase.rpc('soft_delete_batch_with_related_data', {
      p_batch_id: params.id,
      p_user_id: user.id
    })

    if (error) {
      console.error("Error deleting batch:", error)
      return NextResponse.json(
        { error: "Failed to delete batch", message: error.message },
        { status: 500 }
      )
    }
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(batch)
  } catch (error: any) {
    console.error("Error in batch deletion:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", message: error.message },
      { status: 500 }
    )
  }
}