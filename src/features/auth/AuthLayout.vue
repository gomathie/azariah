<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/BrandMark.vue'
import { LOCALE_NAMES, persistLocale, SUPPORTED_LOCALES, type Locale } from '@/i18n'

const { t, locale } = useI18n()

function setLocale(next: string) {
  locale.value = next as Locale
  persistLocale(next as Locale)
}
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-gradient-to-b from-brand-50 to-slate-50">
    <div class="flex justify-end p-3">
      <label class="text-sm text-slate-600 flex items-center gap-2">
        {{ t('auth.language') }}
        <select
          class="rounded-lg border border-slate-300 bg-white px-2 min-h-10"
          :value="locale"
          @change="setLocale(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="l in SUPPORTED_LOCALES" :key="l" :value="l">{{ LOCALE_NAMES[l] }}</option>
        </select>
      </label>
    </div>
    <div class="flex-1 flex items-start md:items-center justify-center px-4 pb-10">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div class="text-center">
          <BrandMark class="size-16 mx-auto" />
          <div class="text-2xl font-bold text-brand-800 mt-3">Azaria</div>
          <div class="text-sm text-slate-500">{{ t('app.tagline') }}</div>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
