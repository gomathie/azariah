<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import DateRangePicker from '@/features/reports/DateRangePicker.vue'
import { getAccountStatement, type AccountStatement } from '@/features/accounts/api'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'
import { localDate, startOfMonth } from '@/utils/dates'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const from = ref(startOfMonth())
const to = ref(localDate())
const statement = ref<AccountStatement | null>(null)
const error = ref<string | null>(null)
const currency = computed(() => business.current?.currency_code ?? 'GHS')

watch(
  [() => business.current?.id, () => route.params.accountId, from, to],
  async ([id, accountId]) => {
    if (!id || typeof accountId !== 'string') return
    error.value = null
    try {
      statement.value = await getAccountStatement(id, accountId, from.value, to.value)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)

function money(minor: number) {
  return formatMoney(BigInt(minor), currency.value, locale.value)
}
</script>

<template>
  <PageHeader :title="t('accounts.statement')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <DateRangePicker v-model:from="from" v-model:to="to" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <template v-if="statement">
      <p>{{ t('reports.total') }}: {{ money(statement.closing_minor) }}</p>
      <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
        <li class="px-4 py-3 flex justify-between">
          <span>{{ t('accounts.openingBalance') }}</span>
          <span>{{ money(statement.opening_minor) }}</span>
        </li>
        <li v-for="(line, index) in statement.lines" :key="index" class="px-4 py-3 flex justify-between">
          <span>{{ line.date }}</span>
          <span>{{ money(line.amount_minor) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
