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
        message: 'You must be logged in to access items',
        data: null
      }, { status: 401 })
    }

    let query = supabase
      .from("items")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (batchId) {
      query = query.eq("batch_id", batchId)
    }

    const { data: items, error } = await query

    if (error) throw error

    return NextResponse.json({
      status: 'success',
      message: 'Items retrieved successfully',
      data: items
    })
  } catch (error: any) {
    console.error("Error fetching items:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error fetching items',
      data: null
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
        message: 'You must be logged in to create items',
        data: null
      }, { status: 401 })
    }

    // Extract all form data
    const batch_id = formData.get("batch_id") as string
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const purchase_price = formData.get("purchase_price") as string
    const selling_price = formData.get("selling_price") as string
    const margin_percentage = formData.get("margin_percentage") as string
    const margin_value = formData.get("margin_value") as string
    const sold_status = formData.get("sold_status") as string
    const total_cost = formData.get("total_cost") as string
    const image = formData.get("image") as File

    // Validate required fields
    if (!batch_id || !name || !category || !purchase_price || !selling_price) {
      return NextResponse.json({
        status: 'error',
        message: 'Batch ID, name, category, purchase price, and selling price are required',
        data: null
      }, { status: 400 })
    }

    // Start a transaction
    const { data: item, error } = await supabase.rpc('create_item_with_transaction', {
      p_batch_id: batch_id,
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
      p_image_name: image ? image.name : null
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

    return NextResponse.json({
      status: 'success',
      message: 'Item created successfully',
      data: item
    })
  } catch (error: any) {
    console.error("Error creating item:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error creating item',
      data: null
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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
    const id = formData.get("id") as string
    const batch_id = formData.get("batch_id") as string
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const purchase_price = formData.get("purchase_price") as string
    const selling_price = formData.get("selling_price") as string
    const margin_percentage = formData.get("margin_percentage") as string
    const margin_value = formData.get("margin_value") as string
    const sold_status = formData.get("sold_status") as string
    const total_cost = formData.get("total_cost") as string
    const image = formData.get("image") as File

    // Validate required fields
    if (!id || !batch_id || !name || !category || !purchase_price || !selling_price) {
      return NextResponse.json({
        status: 'error',
        message: 'ID, batch ID, name, category, purchase price, and selling price are required',
        data: null
      }, { status: 400 })
    }

    // Start a transaction
    const { data: item, error } = await supabase.rpc('update_item_with_transaction', {
      p_id: id,
      p_batch_id: batch_id,
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
      p_image_name: image ? image.name : null
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
        message: 'You must be logged in to delete items',
        data: null
      }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({
        status: 'error',
        message: 'ID is required',
        data: null
      }, { status: 400 })
    }

    const { data: item, error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

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