import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

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
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(batches)
  } catch (error) {
    console.error("Error fetching batches:", error)
    return NextResponse.json({ error: "Error fetching batches" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const json = await request.json()

    // Call the budget-aware batch creation function
    const { data, error } = await supabase.rpc(
      'create_batch_with_budget_check',
      {
        p_name: json.name,
        p_description: json.description,
        p_purchase_date: json.purchase_date,
        p_total_items: json.total_items,
        p_total_cost: json.total_cost,
        p_user_id: json.user_id
      }
    )

    if (error) throw error

    // Return the batch data from the response
    return NextResponse.json(data.batch)
  } catch (error: any) {
    console.error("Error creating batch:", error)
    if (error.message && error.message.includes("Insufficient budget")) {
      return NextResponse.json({
        error: error.message,
        type: "INSUFFICIENT_BUDGET"
      }, { status: 400 })
    }
    return NextResponse.json({ error: "Error creating batch" }, { status: 500 })
  }
}