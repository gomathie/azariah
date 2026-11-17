<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <PageHeader :title="t('nav.add')" />
  <section class="p-4 space-y-3 max-w-lg">
    <RouterLink
      :to="{ name: 'add-sale' }"
      class="block rounded-xl bg-brand-700 text-white font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('sale.add') }}</RouterLink
    >
    <RouterLink
      :to="{ name: 'add-expense' }"
      class="block rounded-xl bg-white border border-brand-200 text-brand-800 font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('expense.add') }}</RouterLink
    >
    <RouterLink
      :to="{ name: 'add-invoice' }"
      class="block rounded-xl bg-white border border-brand-200 text-brand-800 font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('documents.invoice') }}</RouterLink
    >
    <RouterLink
      :to="{ name: 'add-receipt' }"
      class="block rounded-xl bg-white border border-brand-200 text-brand-800 font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('documents.receipt') }}</RouterLink
    >
  </section>
</template>
