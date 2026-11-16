<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import { getCustomerStatement, recordCollection } from '@/features/customers/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()

const contactId = computed(() => String(route.params.contactId))
const amount = ref<bigint | null>(null)
const accountId = ref('')
const note = ref('')
const when = ref(nowLocalInput())
const outstanding = ref(0n)
const debtReady = ref<Promise<void> | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const minorUnit = computed(() => business.current?.minor_unit ?? 2)

watch(
  () => business.current?.id,
  async (id) => {
    if (!id) return
    await catalog.load(id)
    if (!accountId.value && catalog.accounts[0]) accountId.value = catalog.accounts[0].id
    try {
      const rows = await getCustomerStatement(id, contactId.value)
      outstanding.value = BigInt(rows.at(-1)?.balance_minor ?? 0)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)

async function submit() {
  error.value = null
  const current = business.current
  if (!current || amount.value === null) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (amount.value > outstanding.value) {
    error.value = t('errors.AZ_EXCEEDS_DEBT')
    return
  }
  if (!accountId.value) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  try {
    await recordCollection({
      clientOperationId: crypto.randomUUID(),
      businessId: current.id,
      occurredAt: new Date(when.value).toISOString(),
      contactId: contactId.value,
      amountMinor: amount.value,
      moneyAccountId: accountId.value,
      note: note.value.trim() || null,
    })
    await router.push({ name: 'customer-detail', params: { contactId: contactId.value }, query: { saved: 'payment' } })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}

function nowLocalInput(): string {
  const date = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
</script>

<template>
  <PageHeader :title="t('collection.record')" back />
  <form class="p-4 space-y-4 max-w-lg" @submit.prevent="submit">
    <p class="text-slate-700">
      {{ t('collection.outstanding') }}: {{ formatMoney(outstanding, currency, locale) }}
    </p>
    <MoneyInput v-model="amount" :label="t('collection.amount')" :currency="currency" :minor-unit="minorUnit" />
    <AppSelect
      v-model="accountId"
      :label="t('collection.account')"
      :options="catalog.accounts.map((a) => ({ value: a.id, label: a.name }))"
    />
    <AppInput v-model="when" :label="t('sale.when')" type="datetime-local" />
    <AppInput v-model="note" :label="t('collection.note')" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppButton type="submit" block size="lg" :loading="loading">{{ t('app.save') }}</AppButton>
  </form>
</template>
