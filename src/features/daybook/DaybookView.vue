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
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const sync = useSyncStore()
const rows = ref<DaybookRow[]>([])
const cursor = ref<DaybookCursor | null>(null)
const error = ref<string | null>(null)
const banner = ref('')

const savedMessage = computed(() => {
  if (banner.value) return banner.value
  if (route.query.saved === 'sale') return t('sale.saved')
  if (route.query.saved === 'expense') return t('expense.saved')
  if (route.query.saved === 'offline') return t('sync.savedOnDevice')
  return ''
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
    error.value = t('errors.generic')
  }
}

async function loadMore() {
  const id = business.current?.id
  if (!id || !cursor.value) return
  const page = await getDaybook({ businessId: id, cursor: cursor.value })
  rows.value = [...rows.value, ...page.rows]
  cursor.value = page.nextCursor
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
    <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="row in rows" :key="row.id">
        <RouterLink
          :to="{ name: 'transaction', params: { transactionId: row.id } }"
          class="px-4 py-3 flex items-center justify-between gap-3 min-h-14"
        >
          <span>
            <span class="block font-medium text-slate-900">{{ label(row) }}</span>
            <span class="block text-sm text-slate-500">{{ row.business_date }}</span>
          </span>
          <span class="font-medium text-slate-900">{{
            formatMoney(BigInt(row.amount_minor), business.current?.currency_code ?? 'GHS', locale)
          }}</span>
        </RouterLink>
      </li>
    </ul>
    <AppButton v-if="cursor" type="button" variant="secondary" block @click="loadMore">{{ t('daybook.more') }}</AppButton>
  </section>
</template>
