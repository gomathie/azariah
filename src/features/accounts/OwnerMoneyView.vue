<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import { recordOwnerMovement } from '@/features/accounts/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'

const { t } = useI18n()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()
const direction = ref<'contribution' | 'withdrawal'>('contribution')
const accountId = ref('')
const amount = ref<bigint | null>(null)
const note = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const minorUnit = computed(() => business.current?.minor_unit ?? 2)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const accountOptions = computed(() => catalog.accounts.map((a) => ({ value: a.id, label: a.name })))

watch(
  () => business.current?.id,
  (id) => {
    if (id) void catalog.load(id)
  },
  { immediate: true },
)
watch(
  () => catalog.accounts,
  (accounts) => {
    if (!accountId.value && accounts[0]) accountId.value = accounts[0].id
  },
  { immediate: true },
)

async function submit() {
  error.value = null
  const current = business.current
  if (!current || amount.value === null || amount.value <= 0n) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (!accountId.value) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  try {
    await recordOwnerMovement({
      businessId: current.id,
      accountId: accountId.value,
      amountMinor: amount.value,
      direction: direction.value,
      note: note.value.trim() || null,
    })
    await router.push({ name: 'accounts', query: { saved: 'owner' } })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageHeader :title="t('owner.title')" back />
  <form class="p-4 space-y-4 max-w-lg" novalidate @submit.prevent="submit">
    <AppAlert kind="info">{{ t('owner.hint') }}</AppAlert>
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-slate-700">{{ t('owner.what') }}</legend>
      <label
        v-for="option in ['contribution', 'withdrawal'] as const"
        :key="option"
        class="flex items-center gap-3 rounded-xl border bg-white px-4 min-h-14"
        :class="direction === option ? 'border-brand-600 ring-2 ring-brand-200' : 'border-slate-200'"
      >
        <input v-model="direction" type="radio" name="direction" :value="option" class="size-5 accent-brand-700" />
        <span>{{ option === 'contribution' ? t('owner.in') : t('owner.out') }}</span>
      </label>
    </fieldset>
    <AppSelect v-model="accountId" :label="t('owner.account')" :options="accountOptions" />
    <MoneyInput v-model="amount" :label="t('owner.amount')" :currency="currency" :minor-unit="minorUnit" />
    <AppInput v-model="note" :label="t('owner.note')" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppButton type="submit" block :loading="loading">{{ t('app.save') }}</AppButton>
  </form>
</template>
