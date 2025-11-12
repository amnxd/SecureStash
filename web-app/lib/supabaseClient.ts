import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  // During build on hosting platforms these env vars may be unset. Avoid creating a real client with empty credentials
  // which throws. Create a lightweight stub to allow pages to import without runtime failure. Runtime code paths should
  // check for valid vars and avoid calling supabase methods when missing.
  console.warn('Supabase credentials missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

let _supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
}

// Export a thin wrapper that throws only when used without configuration
export const supabase: SupabaseClient = (_supabase as SupabaseClient) || ({} as SupabaseClient)
