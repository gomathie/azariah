<script setup lang="ts">
import { formatMoney, formatSignedMoney } from '@/utils/money'

defineProps<{
  label: string
  minor: number | bigint
  currency: string
  locale: string
  /** Show + or − in front, for a figure that can go either way. */
  signed?: boolean
}>()
</script>

<template>
  <article class="h-full rounded-xl border border-slate-200 bg-white px-3 py-3">
    <h2 class="text-sm font-medium text-slate-600">{{ label }}</h2>
    <p class="text-lg font-semibold text-slate-900 tabular-nums break-words">
      {{ signed ? formatSignedMoney(BigInt(minor), currency, locale) : formatMoney(BigInt(minor), currency, locale) }}
    </p>
  </article>
</template>
