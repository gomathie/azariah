<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { listPending } from '@/lib/offline/queue'
import type { PendingOperation } from '@/lib/offline/db'
import { useBusinessStore } from '@/stores/business'
import { useSyncStore } from '@/stores/sync'
import AppButton from '@/components/ui/AppButton.vue'

const { t } = useI18n()
const business = useBusinessStore()
const sync = useSyncStore()
const rows = ref<PendingOperation[]>([])
const banner = ref('')

async function load() {
  const id = business.current?.id
  rows.value = id ? await listPending(id) : []
  await sync.refresh()
}

watch(() => business.current?.id, () => void load(), { immediate: true })

async function syncNow() {
  const report = await sync.syncNow()
  banner.value = report.needsAttention > 0 ? t('sync.needsAttention') : t('sync.synced')
  await load()
}
</script>

<template>
  <PageHeader :title="t('sync.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <AppAlert kind="warning">{{ t('sync.warning') }}</AppAlert>
    <AppAlert v-if="banner" kind="success">{{ banner }}</AppAlert>
    <p>{{ t('sync.pending', { count: rows.length }) }}</p>
    <AppButton type="button" :loading="sync.syncing" @click="syncNow">{{ t('sync.syncNow') }}</AppButton>
    <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="row in rows" :key="row.id" class="px-4 py-3 min-h-14">
        <span class="block font-medium">{{ t(`daybook.kinds.${row.kind === 'expense' ? 'expense' : 'sale'}`) }}</span>
        <span class="block text-sm text-slate-500">{{ t(`sync.${row.status === 'saved_on_device' ? 'savedOnDevice' : row.status === 'needs_attention' ? 'needsAttention' : 'syncing'}`) }}</span>
      </li>
    </ul>
  </section>
</template>
