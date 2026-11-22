<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import SummaryCard from '@/features/dashboard/SummaryCard.vue'
import EntryRow from '@/features/daybook/EntryRow.vue'
import { getDaybook, type DaybookRow } from '@/features/daybook/api'
import { getDashboard, type DashboardSummary } from '@/features/dashboard/api'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'
import { localDate, startOfMonth, startOfWeek } from '@/utils/dates'

const { t, locale } = useI18n()
const business = useBusinessStore()
const period = ref<'today' | 'week' | 'month'>('today')
const summary = ref<DashboardSummary | null>(null)
const error = ref<string | null>(null)
const recent = ref<DaybookRow[]>([])

const role = computed(() => business.current?.role ?? 'viewer')
// A viewer can only read, so the shortcuts to record things are not offered.
const quick = computed<{ to: { name: string; query?: Record<string, string> }; label: string; icon: IconName }[]>(() =>
  role.value === 'viewer'
    ? []
    : [
        { to: { name: 'add-sale' }, label: t('home.quickSale'), icon: 'sale' },
        { to: { name: 'add-expense' }, label: t('home.quickExpense'), icon: 'expense' },
        { to: { name: 'customers', query: { pay: '1' } }, label: t('home.quickPayment'), icon: 'payment' },
        { to: { name: 'transfer' }, label: t('home.quickTransfer'), icon: 'transfer' },
      ],
)

const currency = computed(() => business.current?.currency_code ?? 'GHS')
const range = computed(() => {
  const today = localDate()
  if (period.value === 'today') return { from: today, to: today }
  if (period.value === 'week') return { from: startOfWeek(), to: today }
  return { from: startOfMonth(), to: today }
})
// Adding the account balances the database returned; shown as one "money available" figure.
const available = computed(() =>
  (summary.value?.accounts ?? []).reduce((sum, account) => sum + BigInt(account.balance_minor), 0n),
)

watch(
  [() => business.current?.id, range],
  async ([id]) => {
    if (!id) return
    error.value = null
    try {
      summary.value = await getDashboard(id, range.value.from, range.value.to)
    } catch {
      error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
    }
  },
  { immediate: true },
)

// The latest entries are a convenience. If they cannot be read, Home still shows the money picture.
watch(
  () => business.current?.id,
  async (id) => {
    if (!id) return
    try {
      recent.value = (await getDaybook({ businessId: id, limit: 5 })).rows
    } catch {
      recent.value = []
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader :title="t('nav.home')" />
  <section class="p-4 space-y-4 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <template v-if="summary">
      <!-- The first thing a trader asks: how much money is there right now, and where. -->
      <article class="rounded-2xl bg-brand-700 text-white p-4 space-y-3">
        <div>
          <h2 class="text-sm font-medium text-brand-100">{{ t('dashboard.moneyAvailable') }}</h2>
          <p class="text-3xl font-semibold tabular-nums break-words">{{ formatMoney(available, currency, locale) }}</p>
        </div>
        <ul class="space-y-1">
          <li v-for="account in summary.accounts" :key="account.id">
            <RouterLink
              :to="{ name: 'account-statement', params: { accountId: account.id } }"
              class="flex items-center justify-between gap-3 rounded-xl bg-white/10 hover:bg-white/20 px-3 min-h-12"
            >
              <span>{{ account.name }}</span>
              <span class="font-medium tabular-nums">{{ formatMoney(BigInt(account.balance_minor), currency, locale) }}</span>
            </RouterLink>
          </li>
        </ul>
      </article>

      <nav v-if="quick.length" class="grid grid-cols-4 gap-2" :aria-label="t('home.quickLabel')">
        <RouterLink
          v-for="item in quick"
          :key="item.label"
          :to="item.to"
          class="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 text-center"
        >
          <span class="size-12 rounded-full bg-white border border-slate-200 text-brand-700 flex items-center justify-center">
            <AppIcon :name="item.icon" class="size-6" />
          </span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="flex gap-2" role="group" :aria-label="t('dashboard.periodLabel')">
        <button
          v-for="key in ['today', 'week', 'month'] as const"
          :key="key"
          type="button"
          class="min-h-12 px-3 rounded-xl border flex-1"
          :class="period === key ? 'bg-brand-700 text-white border-brand-700' : 'bg-white border-slate-200'"
          :aria-pressed="period === key"
          @click="period = key"
        >
          {{ t(`dashboard.period.${key}`) }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <SummaryCard :label="t('dashboard.sales')" :minor="summary.sales_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.moneyReceived')" :minor="summary.money_received_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.operatingExpenses')" :minor="summary.operating_expenses_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.stockPurchases')" :minor="summary.stock_purchases_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.netCash')" :minor="summary.net_cash_movement_minor" :currency="currency" :locale="locale" signed />
        <RouterLink :to="{ name: 'customers' }" class="block rounded-xl">
          <SummaryCard :label="t('dashboard.customerDebts')" :minor="summary.customer_debts_minor" :currency="currency" :locale="locale" />
        </RouterLink>
      </div>
      <p class="text-sm text-slate-600">{{ t('dashboard.profitNote') }}</p>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.recent') }}</h2>
          <RouterLink :to="{ name: 'daybook' }" class="text-sm font-medium text-brand-800 underline min-h-10 flex items-center">
            {{ t('home.seeAll') }}
          </RouterLink>
        </div>
        <p v-if="recent.length === 0" class="text-slate-600">{{ t('dashboard.noEntries') }}</p>
        <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
          <li v-for="row in recent" :key="row.id">
            <EntryRow :row="row" :currency="currency" />
          </li>
        </ul>
      </div>
    </template>
    <p v-else-if="!error" class="text-slate-600">{{ t('app.loading') }}</p>
  </section>
</template>
