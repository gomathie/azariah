<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import InstallApp from '@/components/ui/InstallApp.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { exportBusiness } from '@/features/settings/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { ref } from 'vue'

const { t } = useI18n()
const business = useBusinessStore()
const error = ref<string | null>(null)
const loading = ref(false)

const links = [
  { name: 'business-settings', label: 'settings.business' },
  { name: 'members', label: 'settings.members' },
  { name: 'accounts', label: 'nav.accounts' },
  { name: 'sync', label: 'nav.sync' },
  { name: 'profile', label: 'nav.profile' },
  { name: 'privacy', label: 'settings.privacy' },
  { name: 'help', label: 'nav.help' },
] as const

async function download() {
  const id = business.current?.id
  if (!id) return
  error.value = null
  loading.value = true
  try {
    const data = await exportBusiness(id)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'azaria-business.json'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageHeader :title="t('settings.title')" />
  <section class="p-4 space-y-3 max-w-lg">
    <InstallApp />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <nav class="flex flex-col gap-2">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="{ name: link.name }"
        class="rounded-xl border border-slate-200 bg-white px-4 min-h-14 flex items-center font-medium"
        >{{ t(link.label) }}</RouterLink
      >
    </nav>
    <AppButton v-if="business.current?.role === 'owner'" type="button" block :loading="loading" @click="download">
      {{ t('settings.export') }}
    </AppButton>
  </section>
</template>
