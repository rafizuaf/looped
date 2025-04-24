import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

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
        { error: 'Unauthorized', message: 'You must be logged in to access reports' },
        { status: 401 }
      )
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Start date and end date are required" },
        { status: 400 }
      )
    }

    // Get all required data for reports
    const [batchesResponse, itemsResponse, costsResponse, budgetResponse] = await Promise.all([
      supabase
        .from("batches")
        .select("*")
        .is("deleted_at", null)
        .gte("purchase_date", startDate)
        .lte("purchase_date", endDate),

      supabase
        .from("items")
        .select("*")
        .is("deleted_at", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate),

      supabase
        .from("operational_costs")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate),

      supabase.rpc('get_budget_summary', {
        p_user_id: user.id
      })
    ])

    if (batchesResponse.error) throw batchesResponse.error
    if (itemsResponse.error) throw itemsResponse.error
    if (costsResponse.error) throw costsResponse.error
    if (budgetResponse.error) throw budgetResponse.error

    // Calculate report metrics
    const totalRevenue = itemsResponse.data
      .filter(item => item.sold_status === "sold")
      .reduce((sum, item) => sum + item.selling_price, 0)

    const totalExpenses = costsResponse.data
      .reduce((sum, cost) => sum + cost.amount, 0)

    const totalItems = itemsResponse.data.length
    const soldItems = itemsResponse.data.filter(item => item.sold_status === "sold").length

    const report = {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalItems,
      soldItems,
      sellThroughRate: (soldItems / totalItems) * 100,
      batches: batchesResponse.data,
      items: itemsResponse.data,
      operationalCosts: costsResponse.data,
      budget: budgetResponse.data
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Error generating report", message: error.message }, { status: 500 })
  }
}