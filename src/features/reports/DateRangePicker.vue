<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
const { t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <label class="block text-sm font-medium text-slate-700">
      {{ t('reports.from') }}
      <input v-model="from" type="date" class="mt-1 w-full min-h-12 rounded-xl border border-slate-300 px-3" />
    </label>
    <label class="block text-sm font-medium text-slate-700">
      {{ t('reports.to') }}
      <input v-model="to" type="date" class="mt-1 w-full min-h-12 rounded-xl border border-slate-300 px-3" />
    </label>
  </div>
</template>
