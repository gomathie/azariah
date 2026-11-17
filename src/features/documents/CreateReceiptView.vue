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
import { getDaybook, type DaybookRow } from '@/features/daybook/api'
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

const source = ref<'now' | 'daybook'>('now')
const amount = ref<bigint | null>(null)
const accountId = ref('')
const contactId = ref<string | null>(null)
const description = ref('')
const when = ref(nowLocalInput())
const rows = ref<DaybookRow[]>([])
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const loading = ref(false)
const transactionId = ref<string | null>(null)

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
    if (!accountId.value && accounts[0]) accountId.value = accounts[0].id
  },
  { immediate: true },
)

watch(
  [() => business.current?.id, source],
  async ([id, which]) => {
    if (!id || which !== 'daybook') return
    error.value = null
    try {
      const page = await getDaybook({ businessId: id, kinds: ['sale', 'collection'], limit: 30 })
      rows.value = page.rows.filter((row) => row.status === 'posted')
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)

async function submitNow() {
  error.value = null
  notice.value = null
  const current = business.current
  if (!current || amount.value === null || amount.value <= 0n) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (!accountId.value) {
    try {
      await catalog.load(current.id)
    } catch {
      // Keep going when the accounts are already on screen.
    }
    if (!accountId.value && catalog.accounts[0]) accountId.value = catalog.accounts[0].id
  }
  if (!accountId.value) {
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
        receivedMinor: amount.value,
        moneyAccountId: accountId.value,
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
    const paper = await issueDocument(current.id, transactionId.value, 'receipt')
    await router.push({ name: 'document', params: { documentId: paper.document_id } })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}

async function fromEntry(row: DaybookRow) {
  const current = business.current
  if (!current) return
  error.value = null
  loading.value = true
  try {
    const paper = await issueDocument(current.id, row.id, 'receipt')
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
  <PageHeader :title="t('documents.receipt')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <p class="text-sm text-slate-700">{{ t('documents.receiptIntro') }}</p>
    <fieldset class="space-y-2">
      <legend class="sr-only">{{ t('documents.receipt') }}</legend>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="source" type="radio" value="now" name="receipt-source" /> {{ t('documents.paidNow') }}
      </label>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="source" type="radio" value="daybook" name="receipt-source" />
        {{ t('documents.fromDaybook') }}
      </label>
    </fieldset>

    <form v-if="source === 'now'" class="space-y-4" @submit.prevent="submitNow">
      <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
      <MoneyInput v-model="amount" :label="t('collection.amount')" :currency="currency" :minor-unit="minorUnit" />
      <AppSelect
        v-model="accountId"
        :label="t('sale.account')"
        :options="catalog.accounts.map((a) => ({ value: a.id, label: a.name }))"
      />
      <CustomerPicker v-model="contactId" />
      <AppInput v-model="description" :label="t('sale.description')" />
      <AppInput v-model="when" :label="t('sale.when')" type="datetime-local" />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppButton type="submit" block size="lg" :loading="loading">{{ t('documents.makeReceipt') }}</AppButton>
    </form>

    <div v-else class="space-y-3">
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <p v-if="rows.length === 0" class="text-slate-600">{{ t('documents.noneToReceipt') }}</p>
      <ul v-else class="space-y-2">
        <li v-for="row in rows" :key="row.id">
          <button
            type="button"
            class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left min-h-14 disabled:opacity-50"
            :disabled="loading"
            @click="fromEntry(row)"
          >
            <span class="block font-medium">{{ t(`daybook.kinds.${row.kind}`) }}</span>
            <span class="text-sm text-slate-600">
              {{ row.description || row.business_date }} ·
              {{ formatMoney(BigInt(row.amount_minor), currency, locale) }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
