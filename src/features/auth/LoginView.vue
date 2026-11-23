<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from './AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { useAuthStore } from '@/stores/auth'
import { safeInternalPath } from '@/utils/safe'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.signIn(email.value.trim(), password.value)
    const redirect = safeInternalPath(route.query.redirect)
    await router.replace(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-xl font-semibold text-slate-900">{{ t('auth.signIn') }}</h1>
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <AppInput v-model="email" :label="t('auth.email')" type="email" autocomplete="email" inputmode="email" required />
      <AppInput v-model="password" :label="t('auth.password')" type="password" autocomplete="current-password" required />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block :loading="loading">{{ t('auth.signIn') }}</AppButton>
    </form>
    <div class="text-sm text-center space-y-2">
      <RouterLink :to="{ name: 'reset-password' }" class="inline-block py-3 text-brand-700 underline">{{ t('auth.forgot') }}</RouterLink>
      <p class="text-slate-600">
        {{ t('auth.noAccount') }}
        <RouterLink :to="{ name: 'signup' }" class="inline-block py-3 text-brand-700 underline">{{ t('auth.signUp') }}</RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
