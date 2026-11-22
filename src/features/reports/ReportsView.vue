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
import { buildReport, reportToSheet } from '@/features/reports/build'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { dateLocale, friendlyDate, localDate, startOfMonth } from '@/utils/dates'
import { formatMoney } from '@/utils/money'
import { buildXlsx, XLSX_MIME } from '@/utils/xlsx'

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
const name = ref<ReportName>('sales')
const reportOptions = computed(() => options.map((option) => ({ value: option.id, label: t(option.label) })))
const accountOptions = computed(() => catalog.accounts.map((account) => ({ value: account.id, label: account.name })))
const from = ref(startOfMonth())
const to = ref(localDate())
const accountId = ref('')
/** The raw answer from the database. The table is derived from it so a language change redraws the labels. */
const payload = ref<unknown>(null)
const loaded = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)
const exporting = ref<'pdf' | 'excel' | null>(null)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const minorUnit = computed(() => business.current?.minor_unit ?? 2)

const day = (iso: string) => friendlyDate(iso, locale.value, { today: t('app.today'), yesterday: t('app.yesterday') })
/** A date with its year, for file contents that are read long after today. */
const plainDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat(dateLocale(locale.value), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  )
}

function tableFor(dayLabel: (iso: string) => string) {
  return buildReport(name.value, payload.value, {
    t,
    money: (minor) => formatMoney(BigInt(Math.round(minor)), currency.value, locale.value),
    major: (minor) => minor / 10 ** minorUnit.value,
    day: dayLabel,
    contactName: (id) => catalog.contacts.find((c) => c.id === id)?.name ?? t('customers.title'),
  })
}

const table = computed(() => tableFor(day))
const title = computed(() => t(options.find((o) => o.id === name.value)?.label ?? 'reports.title'))
const accountName = computed(() => catalog.accounts.find((a) => a.id === accountId.value)?.name ?? '')
const fullTitle = computed(() =>
  name.value === 'account_statement' && accountName.value ? `${title.value}: ${accountName.value}` : title.value,
)
const period = computed(() => t('reports.period', { from: plainDay(from.value), to: plainDay(to.value) }))

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

async function load() {
  const id = business.current?.id
  if (!id) return
  if (name.value === 'account_statement' && !accountId.value) return
  error.value = null
  loading.value = true
  try {
    const filters: Record<string, string> = name.value === 'account_statement' ? { money_account_id: accountId.value } : {}
    payload.value = await runReport(name.value, id, from.value, to.value, filters)
    loaded.value = true
  } catch {
    error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
    loaded.value = false
  } finally {
    loading.value = false
  }
}

function save(bytes: Uint8Array, type: string, extension: string) {
  const blob = new Blob([bytes.slice()], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `azaria-${name.value.replaceAll('_', '-')}-${from.value}-to-${to.value}.${extension}`
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadPdf() {
  exporting.value = 'pdf'
  error.value = null
  try {
    // The PDF library is large, so it is fetched only when someone asks for a PDF.
    const { buildReportPdf } = await import('@/features/reports/pdf')
    const bytes = await buildReportPdf({
      businessName: business.current?.name ?? '',
      title: fullTitle.value,
      period: period.value,
      amountsNote: t('reports.amountsIn', { currency: currency.value }),
      decimals: minorUnit.value,
      table: tableFor(plainDay),
      emptyText: t('reports.empty'),
    })
    save(bytes, 'application/pdf', 'pdf')
  } catch {
    error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
  } finally {
    exporting.value = null
  }
}

function downloadExcel() {
  exporting.value = 'excel'
  error.value = null
  try {
    const data = tableFor(plainDay)
    const body = reportToSheet(data)
    const rows = [
      [business.current?.name ?? 'Azaria'],
      [fullTitle.value],
      [`${period.value} · ${t('reports.amountsIn', { currency: currency.value })}`],
      [],
      ...body,
    ]
    const bold = [0, 1, 4, ...(data.footer ? [rows.length - 1] : [])]
    const widths = data.columns.map((_, i) => (i === 0 ? 30 : 18))
    save(buildXlsx(title.value, rows, { boldRows: bold, decimals: minorUnit.value, widths }), XLSX_MIME, 'xlsx')
  } catch {
    error.value = t('errors.generic')
  } finally {
    exporting.value = null
  }
}

watch([() => business.current?.id, name, from, to, accountId], () => void load(), { immediate: true })
</script>

<template>
  <PageHeader :title="t('reports.title')" />
  <section class="p-4 space-y-4 max-w-3xl">
    <AppSelect v-model="name" :label="t('reports.choose')" :options="reportOptions" />
    <AppSelect
      v-if="name === 'account_statement'"
      v-model="accountId"
      :label="t('reports.col.account')"
      :options="accountOptions"
    />
    <DateRangePicker v-if="name !== 'customer_debts'" v-model:from="from" v-model:to="to" />
    <AppAlert v-if="error" kind="error">
      {{ error }}
      <button type="button" class="underline font-semibold ml-2 min-h-10" @click="load">{{ t('app.retry') }}</button>
    </AppAlert>
    <p v-if="loading && !loaded" class="text-slate-600">{{ t('app.loading') }}</p>
    <template v-if="loaded">
      <ReportTable :table="table" :empty-text="t('reports.empty')" :aria-busy="loading || undefined" />
      <div class="no-print grid grid-cols-2 gap-3">
        <AppButton type="button" variant="secondary" :loading="exporting === 'pdf'" @click="downloadPdf">
          {{ t('reports.pdf') }}
        </AppButton>
        <AppButton type="button" variant="secondary" :loading="exporting === 'excel'" @click="downloadExcel">
          {{ t('reports.excel') }}
        </AppButton>
      </div>
    </template>
  </section>
</template>
