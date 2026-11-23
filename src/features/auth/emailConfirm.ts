import { getSupabase } from '@/lib/supabase/client'
import { callRpc } from '@/lib/supabase/rpc'

export interface EmailConfirmation {
  confirmed: boolean
  email: string | null
}

/** How long "Later" keeps the reminder away. It is a reminder, never a block. */
export const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

const snoozeKey = (userId: string) => `azaria.emailReminder.${userId}`

/** True while the person has asked not to be reminded yet. Storage can be missing or blocked. */
export function isSnoozed(userId: string, now = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(snoozeKey(userId)))
    return Number.isFinite(until) && until > now
  } catch {
    return false
  }
}

export function snooze(userId: string, now = Date.now()): void {
  try {
    localStorage.setItem(snoozeKey(userId), String(now + SNOOZE_MS))
  } catch {
    /* Without storage the reminder simply comes back on the next visit. */
  }
}

/** The code is digits only. People paste it with spaces or type it with a dash. */
export function cleanCode(text: string): string {
  return text.replace(/\D/g, '').slice(0, 10)
}

/** The database decides; it also records the confirmation when this session proves it. */
export function fetchEmailConfirmation(): Promise<EmailConfirmation> {
  return callRpc<EmailConfirmation>('rpc_email_confirmation', {})
}

/** Emails a code (and a link) to the address. Never creates an account. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/` },
  })
  if (error) throw error
}

/**
 * Checks the code. A right code starts a fresh session that carries the proof,
 * and the database then records the email as confirmed.
 */
export async function confirmEmailCode(email: string, code: string): Promise<boolean> {
  const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) throw error
  return (await fetchEmailConfirmation()).confirmed
}

/** Which message to show for a failure from the sign-in service. */
export function emailCodeErrorKey(err: unknown): string {
  const e = err as { status?: number; code?: string; message?: string } | null
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`
  if (e?.status === 429 || /rate limit|security purposes|over_email_send/i.test(text)) return 'emailConfirm.wait'
  if (/expired|invalid|otp/i.test(text)) return 'emailConfirm.wrongCode'
  if (/fetch|network|load failed/i.test(text)) return 'errors.network'
  return 'errors.generic'
}
