<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from './AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const loading = ref(false)

// Arriving from the recovery email, Supabase has already signed the user in (PKCE flow),
// so they set a new password. Otherwise they request the email.
const recoveryMode = auth.isSignedIn

async function requestEmail() {
  error.value = null
  loading.value = true
  try {
    await auth.resetPassword(email.value.trim())
    info.value = t('auth.resetSent')
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.generic')
  } finally {
    loading.value = false
  }
}

async function setNewPassword() {
  error.value = null
  if (password.value.length < 8) {
    error.value = t('auth.passwordHint')
    return
  }
  loading.value = true
  try {
    await auth.updatePassword(password.value)
    await router.replace({ name: 'home' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-xl font-semibold text-slate-900">{{ t('auth.resetTitle') }}</h1>
    <AppAlert v-if="info" kind="success">{{ info }}</AppAlert>
    <form v-else-if="recoveryMode" class="space-y-4" novalidate @submit.prevent="setNewPassword">
      <AppInput
        v-model="password"
        :label="t('auth.newPassword')"
        type="password"
        autocomplete="new-password"
        :hint="t('auth.passwordHint')"
        required
      />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block :loading="loading">{{ t('auth.updatePassword') }}</AppButton>
    </form>
    <form v-else class="space-y-4" novalidate @submit.prevent="requestEmail">
      <AppAlert v-if="auth.emailLinkFailed" kind="warning">{{ t('auth.linkExpired') }}</AppAlert>
      <AppInput v-model="email" :label="t('auth.email')" type="email" autocomplete="email" inputmode="email" required />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block :loading="loading">{{ t('auth.resetSend') }}</AppButton>
    </form>
  </AuthLayout>
</template>
