import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Links in our emails carry a one-time token in the address
 * (`?token_hash=…&type=recovery`). The app hands it to Supabase itself, so the link works in
 * any browser. Supabase's own redirect link only works in the browser that asked for the
 * email, and a mail app often opens a different one.
 */
const TYPES: readonly EmailOtpType[] = ['recovery', 'magiclink', 'email', 'signup', 'invite', 'email_change']

export interface EmailLink {
  tokenHash: string
  type: EmailOtpType
}

/** Reads the token from an address's query string. Anything odd is ignored. */
export function readEmailLink(search: string): EmailLink | null {
  const params = new URLSearchParams(search)
  const tokenHash = params.get('token_hash')
  const type = params.get('type') as EmailOtpType | null
  if (!tokenHash || !type || !TYPES.includes(type)) return null
  // Supabase token hashes are short and plain. Refuse anything else before sending it on.
  if (!/^[A-Za-z0-9_-]{16,200}$/.test(tokenHash)) return null
  return { tokenHash, type }
}
