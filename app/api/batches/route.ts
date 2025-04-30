import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: batches, error } = await supabase
      .from("batches")
      .select(`
        *,
        items:items(*),
        operational_costs:operational_costs(*)
      `)
      .is('deleted_at', null)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json({
      status: 'success',
      message: 'Batches retrieved successfully',
      data: batches
    })
  } catch (error: any) {
    console.error("Error fetching batches:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error fetching batches',
      data: null
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      purchase_date,
      total_items,
      total_cost,
      items,
      operational_costs
    } = body

    // First create the batch with budget check
    const { data: batchResult, error: batchError } = await supabase
      .rpc('create_batch_with_budget_check', {
        p_name: name,
        p_description: description,
        p_purchase_date: purchase_date,
        p_total_items: total_items,
        p_total_cost: total_cost,
        p_user_id: user.id
      })

    if (batchError) {
      console.error('Error creating batch:', batchError)
      return NextResponse.json(
        { error: batchError.message },
        { status: 500 }
      )
    }

    const batchId = batchResult.batch.id

    // Create items
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('items')
        .insert({
          batch_id: batchId,
          name: item.name,
          category: item.category,
          purchase_price: parseFloat(item.purchase_price),
          selling_price: parseFloat(item.selling_price),
          margin_percentage: ((parseFloat(item.selling_price) - parseFloat(item.purchase_price)) / parseFloat(item.purchase_price)) * 100,
          margin_value: parseFloat(item.selling_price) - parseFloat(item.purchase_price),
          sold_status: item.sold_status || 'unsold',
          total_cost: parseFloat(item.purchase_price),
          image_url: item.image_url,
          user_id: user.id
        })

      if (itemError) {
        console.error('Error creating item:', itemError)
        return NextResponse.json(
          { error: `Failed to create item: ${itemError.message}` },
          { status: 500 }
        )
      }
    }

    // Create operational costs
    for (const cost of operational_costs) {
      const { error: costError } = await supabase
        .rpc('add_operational_cost_with_budget_check', {
          p_name: cost.name,
          p_amount: parseFloat(cost.amount),
          p_date: purchase_date,
          p_user_id: user.id,
          p_batch_id: batchId,
          p_category: cost.category || 'general'
        })

      if (costError) {
        console.error('Error creating operational cost:', costError)
        return NextResponse.json(
          { error: `Failed to create operational cost: ${costError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      data: {
        id: batchId,
        name,
        description,
        purchase_date,
        total_items,
        total_cost,
        user_id: user.id
      }
    })
  } catch (error) {
    console.error('Error in batch creation:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}