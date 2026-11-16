<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import { transferBetweenAccounts } from '@/features/accounts/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'

const { t } = useI18n()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()
const amount = ref<bigint | null>(null)
const fromId = ref('')
const toId = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const minorUnit = computed(() => business.current?.minor_unit ?? 2)
const currency = computed(() => business.current?.currency_code ?? 'GHS')

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
    if (!fromId.value && accounts[0]) fromId.value = accounts[0].id
    if (!toId.value && accounts[1]) toId.value = accounts[1].id
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
  if (!fromId.value || !toId.value || fromId.value === toId.value) {
    error.value = t('errors.AZ_SAME_ACCOUNT')
    return
  }
  loading.value = true
  try {
    await transferBetweenAccounts({
      businessId: current.id,
      occurredAt: new Date().toISOString(),
      fromAccountId: fromId.value,
      toAccountId: toId.value,
      amountMinor: amount.value,
      note: null,
    })
    await router.push({ name: 'accounts' })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageHeader :title="t('transfer.title')" back />
  <form class="p-4 space-y-4 max-w-lg" @submit.prevent="submit">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppSelect
      v-model="fromId"
      :label="t('transfer.from')"
      :options="catalog.accounts.map((account) => ({ value: account.id, label: account.name }))"
    />
    <AppSelect
      v-model="toId"
      :label="t('transfer.to')"
      :options="catalog.accounts.map((account) => ({ value: account.id, label: account.name }))"
    />
    <MoneyInput v-model="amount" :label="t('transfer.amount')" :currency="currency" :minor-unit="minorUnit" />
    <AppButton type="submit" block :loading="loading">{{ t('app.save') }}</AppButton>
  </form>
</template>
