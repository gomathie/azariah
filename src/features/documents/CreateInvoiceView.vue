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
import CustomerPicker from '@/features/customers/CustomerPicker.vue'
import { issueDocument } from '@/features/documents/api'
import { createSale } from '@/features/sales/api'
import { isSavedOnDevice } from '@/lib/offline/save'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()

const amount = ref<bigint | null>(null)
const received = ref<bigint | null>(null)
const mode = ref<'all' | 'part' | 'none'>('none')
const accountId = ref('')
const contactId = ref<string | null>(null)
const description = ref('')
const when = ref(nowLocalInput())
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const loading = ref(false)
const transactionId = ref<string | null>(null)

const minorUnit = computed(() => business.current?.minor_unit ?? 2)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const receivedMinor = computed(() => {
  if (amount.value === null) return null
  if (mode.value === 'all') return amount.value
  if (mode.value === 'none') return 0n
  return received.value
})
const credit = computed(() => {
  if (amount.value === null || receivedMinor.value === null) return null
  return amount.value - receivedMinor.value
})

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
  notice.value = null
  const current = business.current
  if (!current || amount.value === null || receivedMinor.value === null) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (receivedMinor.value > amount.value) {
    error.value = t('errors.AZ_INVALID_AMOUNT')
    return
  }
  if (!contactId.value) {
    error.value = t('documents.customerRequired')
    return
  }
  if (receivedMinor.value > 0n && !accountId.value) {
    try {
      await catalog.load(current.id)
    } catch {
      // Keep going when the accounts are already on screen.
    }
    if (!accountId.value && catalog.accounts[0]) accountId.value = catalog.accounts[0].id
  }
  if (receivedMinor.value > 0n && !accountId.value) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  try {
    if (!transactionId.value) {
      const result = await createSale({
        clientOperationId: crypto.randomUUID(),
        businessId: current.id,
        occurredAt: new Date(when.value).toISOString(),
        amountMinor: amount.value,
        receivedMinor: receivedMinor.value,
        moneyAccountId: receivedMinor.value > 0n ? accountId.value : null,
        contactId: contactId.value,
        categoryId: null,
        description: description.value.trim() || null,
        note: null,
      })
      if (isSavedOnDevice(result)) {
        notice.value = t('documents.savedOffline')
        return
      }
      transactionId.value = result.transaction_id
    }
    const paper = await issueDocument(current.id, transactionId.value, 'invoice')
    await router.push({ name: 'document', params: { documentId: paper.document_id } })
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
  <PageHeader :title="t('documents.invoice')" back />
  <form class="p-4 space-y-4 max-w-lg" @submit.prevent="submit">
    <p class="text-sm text-slate-700">{{ t('documents.invoiceIntro') }}</p>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
    <MoneyInput v-model="amount" :label="t('sale.amount')" :currency="currency" :minor-unit="minorUnit" />
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-slate-700">{{ t('sale.received') }}</legend>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="mode" type="radio" value="all" name="invoice-received" /> {{ t('sale.receivedAll') }}
      </label>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="mode" type="radio" value="part" name="invoice-received" /> {{ t('sale.receivedPart') }}
      </label>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="mode" type="radio" value="none" name="invoice-received" /> {{ t('sale.receivedNone') }}
      </label>
    </fieldset>
    <MoneyInput
      v-if="mode === 'part'"
      v-model="received"
      :label="t('sale.received')"
      :currency="currency"
      :minor-unit="minorUnit"
    />
    <p v-if="credit !== null && credit > 0n" class="text-sm text-slate-700">
      {{ t('sale.onCredit') }}: {{ formatMoney(credit, currency, locale) }}
    </p>
    <AppSelect
      v-if="mode !== 'none'"
      v-model="accountId"
      :label="t('sale.account')"
      :options="catalog.accounts.map((a) => ({ value: a.id, label: a.name }))"
    />
    <CustomerPicker v-model="contactId" />
    <AppInput v-model="description" :label="t('sale.description')" />
    <AppInput v-model="when" :label="t('sale.when')" type="datetime-local" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppButton type="submit" block size="lg" :loading="loading">{{ t('documents.makeInvoice') }}</AppButton>
  </form>
</template>
