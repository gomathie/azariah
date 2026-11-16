import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed<User | null>(() => session.value?.user ?? null)
  const isSignedIn = computed(() => session.value !== null)
  const initialized = ref(false)
  let initPromise: Promise<void> | null = null

  /** Resolve once the persisted session (if any) has been restored. Safe to call repeatedly. */
  function ready(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (!initPromise) {
      initPromise = (async () => {
        const supabase = getSupabase()
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
    return { needsEmailConfirmation: data.session === null }
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

  return { session, user, isSignedIn, ready, signIn, signUp, resetPassword, updatePassword, signOut }
})
