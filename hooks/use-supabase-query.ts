import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

async function fetcher([table, query]: [string, any]) {
  const { data, error } = await query
  if (error) throw error
  return data
}

export function useSupabaseQuery(table: string, query: any) {
  return useSWR([table, query], fetcher, {
    refreshInterval: 1000 * 60, // Refresh every minute
    revalidateOnFocus: true,
  })
}