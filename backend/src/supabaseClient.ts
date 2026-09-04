import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

// A client with no user context -- only enough to call auth.signUp /
// auth.signInWithPassword, which don't require an existing session.
export function getAnonClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase is not configured on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

// A client that forwards the calling user's own access token, so every
// query is subject to the same Row Level Security policies that governed
// the old browser client. The backend never uses a service-role key to
// bypass RLS.
export function getClientForToken(accessToken: string): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase is not configured on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
