<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

<!-- A row in the Settings menu. Hidden once Azaria runs as an installed app. -->
<template>
  <div v-if="!appInstalled" class="space-y-2">
    <button
      type="button"
      class="w-full text-left rounded-xl border border-slate-200 bg-white px-4 min-h-14 flex flex-col justify-center hover:bg-slate-50"
      @click="install"
    >
      <span class="font-medium">{{ t('install.action') }}</span>
      <span class="text-sm text-slate-600">{{ t('install.hint') }}</span>
    </button>
    <AppAlert v-if="help === 'ios'" kind="info">{{ t('install.ios') }}</AppAlert>
    <AppAlert v-else-if="help === 'browser'" kind="info">{{ t('install.browser') }}</AppAlert>
  </div>
</template>
