<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <PageHeader :title="t('privacy.title')" back />
  <section class="p-4 max-w-lg text-slate-700 leading-relaxed">
    <p>{{ t('privacy.body') }}</p>
  </section>
</template>
