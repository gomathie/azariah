<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'

const { t } = useI18n()
</script>

<template>
  <AuthLayout>
    <h1 class="text-xl font-semibold text-slate-900">{{ t('auth.welcome') }}</h1>
    <p class="text-slate-600">{{ t('auth.intro') }}</p>
    <div class="space-y-3 pt-2">
      <RouterLink
        :to="{ name: 'signup' }"
        class="block text-center rounded-xl bg-brand-700 text-white font-semibold min-h-12 leading-[3rem] hover:bg-brand-800"
        >{{ t('auth.signUp') }}</RouterLink
      >
      <RouterLink
        :to="{ name: 'login' }"
        class="block text-center rounded-xl bg-white border border-brand-200 text-brand-800 font-semibold min-h-12 leading-[3rem] hover:bg-brand-50"
        >{{ t('auth.signIn') }}</RouterLink
      >
    </div>
  </AuthLayout>
</template>
