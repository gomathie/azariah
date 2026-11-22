<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import SummaryCard from '@/features/dashboard/SummaryCard.vue'
import { getDashboard, type DashboardSummary } from '@/features/dashboard/api'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'
import { localDate, startOfMonth, startOfWeek } from '@/utils/dates'

const { t, locale } = useI18n()
const business = useBusinessStore()
const period = ref<'today' | 'week' | 'month'>('month')
const summary = ref<DashboardSummary | null>(null)
const error = ref<string | null>(null)

const currency = computed(() => business.current?.currency_code ?? 'GHS')
const range = computed(() => {
  const today = localDate()
  if (period.value === 'today') return { from: today, to: today }
  if (period.value === 'week') return { from: startOfWeek(), to: today }
  return { from: startOfMonth(), to: today }
})

watch(
  [() => business.current?.id, range],
  async ([id]) => {
    if (!id) return
    error.value = null
    try {
      summary.value = await getDashboard(id, range.value.from, range.value.to)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader :title="t('nav.home')" />
  <section class="p-4 space-y-4 max-w-lg">
    <div class="flex gap-2" role="group" :aria-label="t('dashboard.period.month')">
      <button
        v-for="key in ['today', 'week', 'month'] as const"
        :key="key"
        type="button"
        class="min-h-12 px-3 rounded-xl border"
        :class="period === key ? 'bg-brand-700 text-white border-brand-700' : 'bg-white border-slate-200'"
        @click="period = key"
      >
        {{ t(`dashboard.period.${key}`) }}
      </button>
    </div>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <template v-if="summary">
      <div class="grid grid-cols-1 gap-3">
        <SummaryCard :label="t('dashboard.sales')" :minor="summary.sales_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.moneyReceived')" :minor="summary.money_received_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.operatingExpenses')" :minor="summary.operating_expenses_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.stockPurchases')" :minor="summary.stock_purchases_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.netCash')" :minor="summary.net_cash_movement_minor" :currency="currency" :locale="locale" />
        <SummaryCard :label="t('dashboard.customerDebts')" :minor="summary.customer_debts_minor" :currency="currency" :locale="locale" />
      </div>
      <p class="text-sm text-slate-600">{{ t('dashboard.profitNote') }}</p>
      <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.moneyAvailable') }}</h2>
      <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
        <li v-for="account in summary.accounts" :key="account.id">
          <RouterLink
            :to="{ name: 'account-statement', params: { accountId: account.id } }"
            class="px-4 py-3 min-h-14 flex items-center justify-between"
          >
            <span>{{ account.name }}</span>
            <span>{{ formatMoney(BigInt(account.balance_minor), currency, locale) }}</span>
          </RouterLink>
        </li>
      </ul>
    </template>
    <p v-else-if="!error" class="text-slate-600">{{ t('app.loading') }}</p>
  </section>
</template>
