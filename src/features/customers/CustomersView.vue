<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <PageHeader :title="t('nav.customers')" />
  <section class="p-4 text-slate-600">{{ t('app.loading') }}</section>
</template>
