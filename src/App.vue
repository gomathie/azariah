<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOnline } from '@vueuse/core'

const { t } = useI18n()
const online = useOnline()
</script>

<template>
  <div
    v-if="!online"
    role="status"
    class="no-print bg-amber-100 text-amber-900 text-sm px-4 py-2 text-center"
  >
    {{ t('app.offline') }}
  </div>
  <RouterView />
</template>
