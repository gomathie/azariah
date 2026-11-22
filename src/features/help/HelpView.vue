<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'

const { t } = useI18n()
const cards = ['sale', 'expense', 'debt', 'move', 'reverse', 'paper'] as const
</script>

<template>
  <PageHeader :title="t('help.title')" back />
  <section class="p-4 space-y-3 max-w-lg">
    <RouterLink
      :to="{ name: 'guide', params: { which: 'user' } }"
      class="block rounded-xl bg-brand-700 text-white font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('guide.readUser') }}</RouterLink
    >
    <article v-for="card in cards" :key="card" class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="font-semibold text-slate-900">{{ t(`help.cards.${card}.title`) }}</h2>
      <p class="mt-1 text-slate-700">{{ t(`help.cards.${card}.body`) }}</p>
    </article>
  </section>
</template>
