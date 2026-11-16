<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/features/auth/AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { useBusinessStore, type CreateBusinessInput } from '@/stores/business'
import { useAuthStore } from '@/stores/auth'
import { COUNTRIES, CURRENCIES } from '@/utils/locales'
import { RpcError } from '@/lib/supabase/rpc'

const { t } = useI18n()
const business = useBusinessStore()
const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const businessType = ref<CreateBusinessInput['businessType']>('retail')
const countryCode = ref('GH')
const currencyCode = ref('GHS')
const timezone = ref('Africa/Accra')
const error = ref<string | null>(null)
const loading = ref(false)

const typeOptions = computed(() =>
  (['retail', 'food', 'services', 'other'] as const).map((v) => ({ value: v, label: t(`onboarding.types.${v}`) })),
)
const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.name }))
const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const timezoneOptions = computed(() => {
  const list = 'supportedValuesOf' in Intl ? Intl.supportedValuesOf('timeZone') : ['Africa/Accra', 'UTC']
  return list.map((z) => ({ value: z, label: z }))
})

// Country only *suggests* currency and timezone; the user can change both (spec §3.2).
watch(countryCode, (code) => {
  const c = COUNTRIES.find((x) => x.code === code)
  if (c) {
    currencyCode.value = c.currency
    timezone.value = c.timezone
  }
})

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
      countryCode: countryCode.value,
      currencyCode: currencyCode.value,
      timezone: timezone.value,
    })
    await router.replace({ name: 'home', query: { welcome: '1' } })
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
      <AppSelect v-model="countryCode" :label="t('onboarding.country')" :options="countryOptions" />
      <AppSelect v-model="currencyCode" :label="t('onboarding.currency')" :options="currencyOptions" />
      <AppSelect v-model="timezone" :label="t('onboarding.timezone')" :options="timezoneOptions" />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block size="lg" :loading="loading">{{ t('onboarding.create') }}</AppButton>
    </form>
    <button type="button" class="text-sm text-slate-500 underline w-full text-center min-h-10" @click="signOut">
      {{ t('nav.signOut') }}
    </button>
  </AuthLayout>
</template>
