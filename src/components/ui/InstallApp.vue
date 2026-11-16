<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { appInstalled, isIosBrowser, promptInstall } from '@/lib/pwa/install'

const { t } = useI18n()
const help = ref<'ios' | 'browser' | null>(null)

async function install() {
  help.value = null
  const outcome = await promptInstall()
  if (outcome === 'unavailable') help.value = isIosBrowser() ? 'ios' : 'browser'
}
</script>

<template>
  <section v-if="!appInstalled" class="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
    <div>
      <h2 class="font-semibold text-slate-900">{{ t('install.title') }}</h2>
      <p class="text-sm text-slate-700 mt-1">{{ t('install.hint') }}</p>
    </div>
    <AppButton type="button" block @click="install">{{ t('install.action') }}</AppButton>
    <AppAlert v-if="help === 'ios'" kind="info">{{ t('install.ios') }}</AppAlert>
    <AppAlert v-else-if="help === 'browser'" kind="info">{{ t('install.browser') }}</AppAlert>
  </section>
</template>
