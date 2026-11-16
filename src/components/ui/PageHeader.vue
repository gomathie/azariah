<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

defineProps<{ title: string; back?: boolean }>()
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <header class="no-print flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
    <button
      v-if="back"
      type="button"
      class="min-h-12 min-w-12 -ml-2 rounded-xl flex items-center justify-center hover:bg-slate-100"
      :aria-label="t('app.back')"
      @click="router.back()"
    >
      <span aria-hidden="true" class="text-2xl leading-none">‹</span>
    </button>
    <h1 class="text-lg font-semibold text-slate-900 truncate flex-1">{{ title }}</h1>
    <slot name="actions" />
  </header>
</template>
