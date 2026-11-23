import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { readEmailLink } from '@/features/auth/emailLink'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed<User | null>(() => session.value?.user ?? null)
  const isSignedIn = computed(() => session.value !== null)
  const initialized = ref(false)
  /** True when the page was opened from an email link that is too old or already used. */
  const emailLinkFailed = ref(false)
  let initPromise: Promise<void> | null = null

  /** Resolve once the persisted session (if any) has been restored. Safe to call repeatedly. */
  function ready(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (!initPromise) {
      initPromise = (async () => {
        const supabase = getSupabase()
        // Arriving from a link in one of our emails: trade its one-time token for a session.
        const link = readEmailLink(window.location.search)
        if (link) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
          emailLinkFailed.value = error !== null
        }
        const { data } = await supabase.auth.getSession()
        session.value = data.session
        supabase.auth.onAuthStateChange((_event, next) => {
          session.value = next
        })
        initialized.value = true
      })()
    }
    return initPromise
  }

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    if (error) throw error
    /** When email confirmation is off (local dev), a session is returned immediately. */
    /**
     * For an address that already has an account, Supabase answers as if all went well, sends no
     * email, and returns a person with no identities. Saying "check your email" then leaves the
     * person waiting for a message that never comes.
     */
    const alreadyRegistered = data.session === null && data.user?.identities?.length === 0
    return { needsEmailConfirmation: data.session === null, alreadyRegistered }
  }

  async function resetPassword(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async function updatePassword(password: string) {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw error
    session.value = null
  }

  return { session, user, isSignedIn, emailLinkFailed, ready, signIn, signUp, resetPassword, updatePassword, signOut }
})
