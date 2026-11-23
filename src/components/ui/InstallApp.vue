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

<!-- A row in the profile menu. Hidden once Azaria runs as an installed app. -->
<template>
  <div v-if="!appInstalled" class="space-y-2 border-t border-slate-200 py-1">
    <button
      type="button"
      class="w-full text-left rounded-xl px-3 py-2 min-h-12 flex flex-col justify-center hover:bg-slate-100"
      @click="install"
    >
      <span>{{ t('install.action') }}</span>
      <span class="text-sm text-slate-600">{{ t('install.hint') }}</span>
    </button>
    <AppAlert v-if="help === 'ios'" kind="info">{{ t('install.ios') }}</AppAlert>
    <AppAlert v-else-if="help === 'browser'" kind="info">{{ t('install.browser') }}</AppAlert>
  </div>
</template>
