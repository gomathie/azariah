<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { listDaybook, type DaybookRow } from '@/features/daybook/api'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const rows = ref<DaybookRow[]>([])
const error = ref<string | null>(null)

const savedMessage = computed(() => {
  if (route.query.saved === 'sale') return t('sale.saved')
  if (route.query.saved === 'expense') return t('expense.saved')
  return ''
})

watch(
  () => business.current?.id,
  async (id) => {
    if (!id) return
    error.value = null
    try {
      rows.value = await listDaybook(id)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)

function label(row: DaybookRow) {
  const kind = t(`daybook.kinds.${row.kind}`)
  return row.description ? `${kind} — ${row.description}` : kind
}
</script>

<template>
  <PageHeader :title="t('daybook.title')" />
  <section class="p-4 space-y-3 max-w-lg">
    <AppAlert v-if="savedMessage" kind="success">{{ savedMessage }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!error && rows.length === 0" class="text-slate-600">{{ t('daybook.empty') }}</p>
    <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="row in rows" :key="row.id" class="px-4 py-3 flex items-center justify-between gap-3 min-h-14">
        <span>
          <span class="block font-medium text-slate-900">{{ label(row) }}</span>
          <span class="block text-sm text-slate-500">{{ row.business_date }}</span>
        </span>
        <span class="font-medium text-slate-900">{{
          formatMoney(BigInt(row.amount_minor), business.current?.currency_code ?? 'GHS', locale)
        }}</span>
      </li>
    </ul>
  </section>
</template>
