<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { getDaybook, type DaybookCursor, type DaybookRow } from '@/features/daybook/api'
import { useBusinessStore } from '@/stores/business'
import { useSyncStore } from '@/stores/sync'
import { friendlyDate } from '@/utils/dates'
import { formatMoney, formatSignedMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const sync = useSyncStore()
const rows = ref<DaybookRow[]>([])
const cursor = ref<DaybookCursor | null>(null)
const error = ref<string | null>(null)
const banner = ref('')
const currency = computed(() => business.current?.currency_code ?? 'GHS')

const savedMessage = computed(() => {
  if (banner.value) return banner.value
  if (route.query.saved === 'sale') return t('sale.saved')
  if (route.query.saved === 'expense') return t('expense.saved')
  if (route.query.saved === 'offline') return t('sync.savedOnDevice')
  return ''
})

/** Rows arrive newest first; consecutive rows of one business date share a heading. */
const groups = computed(() => {
  const out: { date: string; rows: DaybookRow[] }[] = []
  for (const row of rows.value) {
    const last = out.at(-1)
    if (last && last.date === row.business_date) last.rows.push(row)
    else out.push({ date: row.business_date, rows: [row] })
  }
  return out
})

async function loadFirst() {
  const id = business.current?.id
  if (!id) return
  error.value = null
  try {
    const page = await getDaybook({ businessId: id })
    rows.value = page.rows
    cursor.value = page.nextCursor
  } catch {
    error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
  }
}

async function loadMore() {
  const id = business.current?.id
  if (!id || !cursor.value) return
  try {
    const page = await getDaybook({ businessId: id, cursor: cursor.value })
    rows.value = [...rows.value, ...page.rows]
    cursor.value = page.nextCursor
  } catch {
    error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
  }
}

watch(() => business.current?.id, () => void loadFirst(), { immediate: true })

async function syncNow() {
  const report = await sync.syncNow()
  banner.value = report.needsAttention > 0 ? t('sync.needsAttention') : t('sync.synced')
  await loadFirst()
}

function label(row: DaybookRow) {
  const kind = t(`daybook.kinds.${row.kind}`)
  return row.description ? `${kind} — ${row.description}` : kind
}

/** Money that actually moved for this entry. Zero for a transfer and for a sale fully on credit. */
function cash(row: DaybookRow): number {
  return (row.money_movements ?? []).reduce((sum, m) => sum + m.amount_minor, 0)
}

function amountText(row: DaybookRow): string {
  const moved = cash(row)
  if (moved === 0) return formatMoney(BigInt(row.amount_minor), currency.value, locale.value)
  return formatSignedMoney(BigInt(moved), currency.value, locale.value)
}

function amountClass(row: DaybookRow): string {
  const moved = cash(row)
  if (moved > 0) return 'text-emerald-700'
  if (moved < 0) return 'text-red-700'
  return 'text-slate-700'
}

/** The quiet second line: customer, account, and what is still unpaid on a credit sale. */
function detail(row: DaybookRow): string {
  const parts: string[] = []
  const moves = row.money_movements ?? []
  if (row.contact?.name) parts.push(row.contact.name)
  if (row.kind === 'transfer') {
    const from = moves.find((m) => m.amount_minor < 0)?.money_account?.name
    const to = moves.find((m) => m.amount_minor > 0)?.money_account?.name
    if (from && to) parts.push(t('daybook.transferRoute', { from, to }))
  } else {
    const names = [...new Set(moves.map((m) => m.money_account?.name).filter((n): n is string => !!n))]
    if (names.length) parts.push(names.join(', '))
  }
  if (row.kind === 'sale' && row.status === 'posted') {
    const unpaid = row.amount_minor - cash(row)
    if (unpaid > 0) {
      parts.push(t('daybook.notPaid', { amount: formatMoney(BigInt(unpaid), currency.value, locale.value) }))
    }
  }
  return parts.join(' · ')
}

const dayLabel = (iso: string) =>
  friendlyDate(iso, locale.value, { today: t('app.today'), yesterday: t('app.yesterday') })
</script>

<template>
  <PageHeader :title="t('daybook.title')">
    <template #actions>
      <AppButton type="button" variant="secondary" :loading="sync.syncing" @click="syncNow">{{ t('nav.sync') }}</AppButton>
    </template>
  </PageHeader>
  <section class="p-4 space-y-3 max-w-lg">
    <AppAlert v-if="savedMessage" kind="success">{{ savedMessage }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!error && rows.length === 0" class="text-slate-600">{{ t('daybook.empty') }}</p>
    <div v-for="group in groups" :key="group.date" class="space-y-2">
      <h2 class="text-sm font-semibold text-slate-600 px-1 pt-1">{{ dayLabel(group.date) }}</h2>
      <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
        <li v-for="row in group.rows" :key="row.id">
          <RouterLink
            :to="{ name: 'transaction', params: { transactionId: row.id } }"
            class="px-4 py-3 flex items-center justify-between gap-3 min-h-14"
          >
            <span class="min-w-0">
              <span
                class="block font-medium text-slate-900"
                :class="row.status === 'reversed' ? 'line-through decoration-slate-400' : ''"
                >{{ label(row) }}</span
              >
              <span v-if="detail(row)" class="block text-sm text-slate-600">{{ detail(row) }}</span>
              <span v-if="row.status === 'reversed'" class="inline-block mt-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">{{
                t('daybook.reversed')
              }}</span>
            </span>
            <span
              class="font-semibold tabular-nums whitespace-nowrap"
              :class="[amountClass(row), row.status === 'reversed' ? 'line-through decoration-slate-400' : '']"
              >{{ amountText(row) }}</span
            >
          </RouterLink>
        </li>
      </ul>
    </div>
    <AppButton v-if="cursor" type="button" variant="secondary" block @click="loadMore">{{ t('daybook.more') }}</AppButton>
  </section>
</template>
