'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(data: { email: string; password: string }) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(data: { email: string; password: string }) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
    redirect('/auth/login')
}   