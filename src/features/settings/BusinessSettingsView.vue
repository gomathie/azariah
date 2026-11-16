<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const business = useBusinessStore()
</script>

<template>
  <PageHeader :title="t('businessSettings.title')" back />
  <section v-if="business.current" class="p-4 space-y-3 max-w-lg">
    <p><span class="text-slate-600">{{ t('businessSettings.name') }}</span><br />{{ business.current.name }}</p>
    <p><span class="text-slate-600">{{ t('businessSettings.country') }}</span><br />{{ business.current.country_code }}</p>
    <p><span class="text-slate-600">{{ t('businessSettings.currency') }}</span><br />{{ business.current.currency_code }}</p>
    <p><span class="text-slate-600">{{ t('businessSettings.timezone') }}</span><br />{{ business.current.timezone }}</p>
  </section>
</template>
