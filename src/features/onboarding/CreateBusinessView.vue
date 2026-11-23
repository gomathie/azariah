<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { useBusinessStore, type CreateBusinessInput } from '@/stores/business'
import { useAuthStore } from '@/stores/auth'
import { RpcError } from '@/lib/supabase/rpc'

const { t } = useI18n()
const business = useBusinessStore()
const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const businessType = ref<CreateBusinessInput['businessType']>('retail')
// Ghana only for now, by the owner's decision of 2026-11-24: set-up asks two things, not five.
// The database and `src/utils/locales.ts` still know the other countries; to open them again,
// bring back the country, currency and time zone choices here.
const HOME = { countryCode: 'GH', currencyCode: 'GHS', timezone: 'Africa/Accra' } as const
const error = ref<string | null>(null)
const loading = ref(false)

const typeOptions = computed(() =>
  (['retail', 'food', 'services', 'salon', 'other'] as const).map((v) => ({ value: v, label: t(`onboarding.types.${v}`) })),
)

async function submit() {
  error.value = null
  if (!name.value.trim()) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  try {
    await business.createBusiness({
      name: name.value.trim(),
      businessType: businessType.value,
      ...HOME,
    })
    // Straight to the books. Adding people to the shop can wait; it is under Settings.
    await router.replace({ name: 'home' })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : e instanceof Error ? e.message : t('errors.generic')
  } finally {
    loading.value = false
  }
}

async function signOut() {
  await auth.signOut()
  await router.replace({ name: 'welcome' })
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-xl font-semibold text-slate-900">{{ t('onboarding.title') }}</h1>
    <p class="text-slate-600 text-sm">{{ t('onboarding.intro') }}</p>
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <AppInput
        v-model="name"
        :label="t('onboarding.businessName')"
        :placeholder="t('onboarding.businessNamePlaceholder')"
        autocomplete="organization"
        required
      />
      <AppSelect v-model="businessType" :label="t('onboarding.businessType')" :options="typeOptions" />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block size="lg" :loading="loading">{{ t('onboarding.create') }}</AppButton>
    </form>
    <button type="button" class="text-sm text-slate-500 underline w-full text-center min-h-10" @click="signOut">
      {{ t('nav.signOut') }}
    </button>
  </AuthLayout>
</template>
