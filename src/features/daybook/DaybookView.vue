<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { getDaybook, type DaybookCursor, type DaybookRow } from '@/features/daybook/api'
import { useBusinessStore } from '@/stores/business'
import { useSyncStore } from '@/stores/sync'
import { friendlyDate } from '@/utils/dates'
import EntryRow from '@/features/daybook/EntryRow.vue'

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
          <EntryRow :row="row" :currency="currency" />
        </li>
      </ul>
    </div>
    <AppButton v-if="cursor" type="button" variant="secondary" block @click="loadMore">{{ t('daybook.more') }}</AppButton>
  </section>
</template>
