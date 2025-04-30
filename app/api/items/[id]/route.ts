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
        message: 'You must be logged in to access item details',
        data: null
      }, { status: 401 })
    }

    const { data: item, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .single()

    if (error) throw error
    if (!item) return NextResponse.json({
      status: 'error',
      message: 'Item not found',
      data: null
    }, { status: 404 })

    return NextResponse.json({
      status: 'success',
      message: 'Item retrieved successfully',
      data: item
    })
  } catch (error: any) {
    console.error("Error fetching item:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error fetching item',
      data: null
    }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()

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
        message: 'You must be logged in to update items',
        data: null
      }, { status: 401 })
    }

    // Extract all form data
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const purchase_price = formData.get("purchase_price") as string
    const selling_price = formData.get("selling_price") as string
    const margin_percentage = formData.get("margin_percentage") as string
    const margin_value = formData.get("margin_value") as string
    const sold_status = formData.get("sold_status") as string
    const total_cost = formData.get("total_cost") as string
    const image = formData.get("image") as File

    // Get the current item to get batch_id and user_id
    const { data: currentItem, error: fetchError } = await supabase
      .from("items")
      .select("batch_id, user_id, sold_status")
      .eq("id", params.id)
      .single()

    if (fetchError) throw fetchError
    if (!currentItem) return NextResponse.json({
      status: 'error',
      message: 'Item not found',
      data: null
    }, { status: 404 })

    // Validate required fields
    if (!name || !category || !purchase_price || !selling_price) {
      return NextResponse.json({
        status: 'error',
        message: 'Name, category, purchase price, and selling price are required',
        data: null
      }, { status: 400 })
    }

    // If the item is being marked as unsold and was previously sold
    if (sold_status === 'unsold' && currentItem.sold_status === 'sold') {
      const { data: reversalResult, error: reversalError } = await supabase
        .rpc('register_item_sale_reversal', {
          p_item_id: params.id,
          p_user_id: user.id
        })

      if (reversalError) {
        console.error("Error reversing item sale:", reversalError)
        return NextResponse.json({
          status: 'error',
          message: reversalError.message || 'Error reversing item sale',
          data: null
        }, { status: 500 })
      }

      return NextResponse.json({
        status: 'success',
        message: 'Item updated and sale reversed successfully',
        data: reversalResult
      })
    }

    // For other updates, use the existing update_item_with_transaction function
    const { data: item, error } = await supabase.rpc('update_item_with_transaction', {
      p_id: params.id,
      p_batch_id: currentItem.batch_id,
      p_name: name,
      p_category: category,
      p_purchase_price: parseFloat(purchase_price),
      p_selling_price: parseFloat(selling_price),
      p_margin_percentage: parseFloat(margin_percentage),
      p_margin_value: parseFloat(margin_value),
      p_sold_status: sold_status,
      p_total_cost: parseFloat(total_cost),
      p_user_id: user.id,
      p_image: image ? await image.arrayBuffer() : null,
      p_image_name: image ? `${Date.now()}-${image.name}` : null
    })

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

    if (!item) return NextResponse.json({
      status: 'error',
      message: 'Item not found',
      data: null
    }, { status: 404 })

    return NextResponse.json({
      status: 'success',
      message: 'Item updated successfully',
      data: item
    })
  } catch (error: any) {
    console.error("Error updating item:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error updating item',
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
        message: 'You must be logged in to delete items',
        data: null
      }, { status: 401 })
    }

    const { data: item, error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error
    if (!item) return NextResponse.json({
      status: 'error',
      message: 'Item not found',
      data: null
    }, { status: 404 })

    return NextResponse.json({
      status: 'success',
      message: 'Item deleted successfully',
      data: item
    })
  } catch (error: any) {
    console.error("Error deleting item:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error deleting item',
      data: null
    }, { status: 500 })
  }
}