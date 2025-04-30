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
        message: 'You must be logged in to access operational costs',
        data: null
      }, { status: 401 })
    }

    const { data: cost, error } = await supabase
      .from("operational_costs")
      .select(`
        *,
        batch:batches(id, name)
      `)
      .eq("id", params.id)
      .is("deleted_at", null)
      .single()

    if (error) throw error
    if (!cost) return NextResponse.json({
      status: 'error',
      message: 'Operational cost not found',
      data: null
    }, { status: 404 })

    return NextResponse.json({
      status: 'success',
      message: 'Operational cost retrieved successfully',
      data: cost
    })
  } catch (error: any) {
    console.error("Error fetching operational cost:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error fetching operational cost',
      data: null
    }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
        message: 'You must be logged in to update operational costs',
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

    const { data: cost, error } = await supabase
      .from("operational_costs")
      .update({
        name: data.name,
        amount: data.amount,
        date: data.date,
        category: data.category,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error
    if (!cost) return NextResponse.json({
      status: 'error',
      message: 'Operational cost not found',
      data: null
    }, { status: 404 })

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