<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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

async function submit() {
  error.value = null
  if (password.value.length < 8) {
    error.value = t('auth.passwordHint')
    return
  }
  loading.value = true
  try {
    const { needsEmailConfirmation } = await auth.signUp(email.value.trim(), password.value)
    if (needsEmailConfirmation) {
      info.value = t('auth.checkEmail')
    } else {
      await router.replace({ name: 'onboarding' })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-xl font-semibold text-slate-900">{{ t('auth.signUp') }}</h1>
    <AppAlert v-if="info" kind="success">{{ info }}</AppAlert>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <AppInput v-model="email" :label="t('auth.email')" type="email" autocomplete="email" inputmode="email" required />
      <AppInput
        v-model="password"
        :label="t('auth.password')"
        type="password"
        autocomplete="new-password"
        :hint="t('auth.passwordHint')"
        required
      />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block :loading="loading">{{ t('auth.signUp') }}</AppButton>
    </form>
    <p class="text-sm text-center text-slate-600">
      {{ t('auth.haveAccount') }}
      <RouterLink :to="{ name: 'login' }" class="inline-block py-3 text-brand-700 underline">{{ t('auth.signIn') }}</RouterLink>
    </p>
  </AuthLayout>
</template>
