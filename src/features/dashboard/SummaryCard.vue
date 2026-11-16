<script setup lang="ts">
import { formatMoney } from '@/utils/money'

defineProps<{
  label: string
  minor: number | bigint
  currency: string
  locale: string
}>()
</script>

<template>
  <article class="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <h2 class="text-sm font-medium text-slate-600">{{ label }}</h2>
    <p class="text-xl font-semibold text-slate-900">{{ formatMoney(BigInt(minor), currency, locale) }}</p>
  </article>
</template>
