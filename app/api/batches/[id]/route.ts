import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
        message: 'You must be logged in to access batch details',
        data: null
      }, { status: 401 })
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
    if (!batch) return NextResponse.json({
      status: 'error',
      message: 'Batch not found',
      data: null
    }, { status: 404 })

    return NextResponse.json({
      status: 'success',
      message: 'Batch retrieved successfully',
      data: batch
    })
  } catch (error: any) {
    console.error("Error fetching batch:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error fetching batch',
      data: null
    }, { status: 500 })
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
        message: 'You must be logged in to update batches',
        data: null
      }, { status: 401 })
    }

    // Validate required fields
    if (!json.name || !json.purchase_date) {
      return NextResponse.json({
        status: 'error',
        message: 'Name and purchase date are required',
        data: null
      }, { status: 400 })
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
      return NextResponse.json({
        status: 'error',
        message: batchError.message || 'Failed to update batch',
        data: null
      }, { status: 500 })
    }
    if (!batch) {
      return NextResponse.json({
        status: 'error',
        message: 'Batch not found',
        data: null
      }, { status: 404 })
    }

    // Update items
    if (json.items) {
      for (const item of json.items) {
        // Validate item data
        if (!item.name || !item.category || !item.purchase_price || !item.selling_price) {
          return NextResponse.json({
            status: 'error',
            message: 'Item name, category, purchase price, and selling price are required',
            data: null
          }, { status: 400 })
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
          return NextResponse.json({
            status: 'error',
            message: itemError.message || 'Failed to update item',
            data: null
          }, { status: 500 })
        }
      }
    }

    // Update operational costs
    if (json.operational_costs) {
      for (const cost of json.operational_costs) {
        // Validate cost data
        if (!cost.name || !cost.amount) {
          return NextResponse.json({
            status: 'error',
            message: 'Cost name and amount are required',
            data: null
          }, { status: 400 })
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
          return NextResponse.json({
            status: 'error',
            message: costError.message || 'Failed to update operational cost',
            data: null
          }, { status: 500 })
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
      return NextResponse.json({
        status: 'error',
        message: fetchError.message || 'Failed to fetch updated batch',
        data: null
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Batch updated successfully',
      data: updatedBatch
    })
  } catch (error: any) {
    console.error("Error in batch update:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An unexpected error occurred',
      data: null
    }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
        message: 'You must be logged in to delete batches',
        data: null
      }, { status: 401 })
    }

    // Start a transaction to soft delete batch and related data
    const { data: batch, error } = await supabase.rpc('soft_delete_batch_with_related_data', {
      p_batch_id: params.id,
      p_user_id: user.id
    })

    if (error) {
      console.error("Error deleting batch:", error)
      return NextResponse.json({
        status: 'error',
        message: error.message || 'Failed to delete batch',
        data: null
      }, { status: 500 })
    }
    if (!batch) {
      return NextResponse.json({
        status: 'error',
        message: 'Batch not found',
        data: null
      }, { status: 404 })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Batch deleted successfully',
      data: batch
    })
  } catch (error: any) {
    console.error("Error in batch deletion:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An unexpected error occurred',
      data: null
    }, { status: 500 })
  }
}