import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export class MissingSupabaseConfigError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).',
    )
    this.name = 'MissingSupabaseConfigError'
  }
}

export type AzariaSupabaseClient = SupabaseClient<Database>

/**
 * Build a Supabase client. Only the public/publishable key is ever used in the browser;
 * authorization is enforced server-side by RLS and RPC membership checks.
 */
export function createSupabaseClient(url: string | undefined, key: string | undefined): AzariaSupabaseClient {
  if (!url || !key) throw new MissingSupabaseConfigError()
  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
}

let instance: AzariaSupabaseClient | null = null

/** Lazily created singleton so importing this module never throws at load time. */
export function getSupabase(): AzariaSupabaseClient {
  if (!instance) {
    instance = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  }
  return instance
}
