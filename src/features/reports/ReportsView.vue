<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import DateRangePicker from '@/features/reports/DateRangePicker.vue'
import ReportTable from '@/features/reports/ReportTable.vue'
import { runReport, type ReportName } from '@/features/reports/api'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { toCsv } from '@/utils/csv'
import { localDate, startOfMonth } from '@/utils/dates'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const business = useBusinessStore()
const catalog = useCatalogStore()
const options: { id: ReportName; label: string }[] = [
  { id: 'sales', label: 'reports.sales' },
  { id: 'money_received', label: 'reports.moneyReceived' },
  { id: 'expenses', label: 'reports.expenses' },
  { id: 'stock', label: 'reports.stock' },
  { id: 'account_statement', label: 'reports.accountStatement' },
  { id: 'cash_movement', label: 'reports.cashMovement' },
  { id: 'customer_debts', label: 'reports.customerDebts' },
]
const name = ref('sales')
const reportOptions = computed(() =>
  options.map((option) => ({ value: option.id, label: t(option.label) })),
)
const accountOptions = computed(() => catalog.accounts.map((account) => ({ value: account.id, label: account.name })))
const from = ref(startOfMonth())
const to = ref(localDate())
const accountId = ref('')
const rows = ref<Record<string, unknown>[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const currency = computed(() => business.current?.currency_code ?? 'GHS')

const columns = computed(() =>
  Object.keys(rows.value[0] ?? {}).map((key) => ({ key, label: key.replaceAll('_', ' ') })),
)

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

function money(value: unknown) {
  const minor = typeof value === 'number' ? value : Number(value ?? 0)
  return formatMoney(BigInt(Number.isFinite(minor) ? minor : 0), currency.value, locale.value)
}

function asRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const record = row as Record<string, unknown>
      return 'outstanding_minor' in record ? { ...record, outstanding: money(record.outstanding_minor) } : record
    })
  }
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.lines)) {
    const lines = (record.lines as Record<string, unknown>[]).map((line) => ({
      date: line.date ?? '',
      kind: line.kind ?? '',
      amount: money(line.amount_minor),
      counted: line.counted ?? '',
    }))
    return [
      { date: '', kind: 'opening', amount: money(record.opening_minor), counted: '' },
      ...lines,
      { date: '', kind: 'closing', amount: money(record.closing_minor ?? record.net_minor), counted: '' },
    ]
  }
  if ('total_minor' in record) return [{ total: money(record.total_minor) }]
  if ('net_minor' in record) return [{ net: money(record.net_minor) }]
  return [record]
}

async function load() {
  const id = business.current?.id
  if (!id) return
  error.value = null
  loading.value = true
  try {
    const filters: Record<string, string> = name.value === 'account_statement' ? { money_account_id: accountId.value } : {}
    rows.value = asRows(await runReport(name.value as ReportName, id, from.value, to.value, filters))
  } catch {
    error.value = t('errors.generic')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function download() {
  const text = toCsv(rows.value)
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `azaria-${name.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}

watch([() => business.current?.id, name, from, to, accountId], () => void load(), { immediate: true })
</script>

<template>
  <PageHeader :title="t('reports.title')">
    <template #actions>
      <button type="button" class="no-print min-h-12 px-3" @click="download">{{ t('reports.exportCsv') }}</button>
      <button type="button" class="no-print min-h-12 px-3" @click="printReport">{{ t('reports.print') }}</button>
    </template>
  </PageHeader>
  <section class="p-4 space-y-4 max-w-3xl">
    <AppSelect v-model="name" :label="t('reports.title')" :options="reportOptions" />
    <AppSelect v-if="name === 'account_statement'" v-model="accountId" :label="t('accounts.title')" :options="accountOptions" />
    <DateRangePicker v-model:from="from" v-model:to="to" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="loading" class="text-slate-600">{{ t('app.loading') }}</p>
    <ReportTable v-else-if="rows.length" :columns="columns" :rows="rows" />
    <AppButton class="no-print" type="button" variant="secondary" @click="load">{{ t('app.retry') }}</AppButton>
  </section>
</template>
