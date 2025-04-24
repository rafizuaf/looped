import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/budget
 * Returns the current budget and summary for the authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                // Ensure the cookie value is properly formatted
                                const cookieValue = value.startsWith('base64-') ? value : `base64-${value}`
                                cookieStore.set(name, cookieValue, {
                                    ...options,
                                    sameSite: 'lax',
                                    secure: process.env.NODE_ENV === 'production',
                                })
                            })
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

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
                { error: 'Unauthorized', message: 'You must be logged in to access your budget' },
                { status: 401 }
            )
        }

        // Call the get_budget_summary function that was created in your migration
        const { data, error } = await supabase.rpc('get_budget_summary', {
            p_user_id: user.id
        })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching budget:', error)
        return NextResponse.json(
            { error: 'Failed to fetch budget', message: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/budget
 * Tops up the user's budget with the specified amount
 */
export async function POST(req: NextRequest) {
    try {
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                // Ensure the cookie value is properly formatted
                                const cookieValue = value.startsWith('base64-') ? value : `base64-${value}`
                                cookieStore.set(name, cookieValue, {
                                    ...options,
                                    sameSite: 'lax',
                                    secure: process.env.NODE_ENV === 'production',
                                })
                            })
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

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
                { error: 'Unauthorized', message: 'You must be logged in to manage your budget' },
                { status: 401 }
            )
        }

        const { amount, description } = await req.json()

        // Validate the amount
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount', message: 'Top-up amount must be a positive number' },
                { status: 400 }
            )
        }

        // Call the top_up_budget function from your migration
        const { data, error } = await supabase.rpc('top_up_budget', {
            p_user_id: user.id,
            p_amount: amount,
            p_description: description || 'Budget top-up'
        })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error topping up budget:', error)
        return NextResponse.json(
            { error: 'Failed to top up budget', message: error.message },
            { status: 500 }
        )
    }
}