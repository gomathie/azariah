<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/BrandMark.vue'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const business = useBusinessStore()

const tabs = [
  { name: 'home', labelKey: 'nav.home', icon: '⌂', primary: false },
  { name: 'daybook', labelKey: 'nav.daybook', icon: '☰', primary: false },
  { name: 'add', labelKey: 'nav.add', icon: '+', primary: true },
  { name: 'customers', labelKey: 'nav.customers', icon: '☺', primary: false },
  { name: 'reports', labelKey: 'nav.reports', icon: '▤', primary: false },
] as const
</script>

<template>
  <div class="min-h-dvh flex flex-col md:flex-row">
    <!-- Desktop side navigation -->
    <nav
      class="no-print hidden md:flex md:flex-col w-60 shrink-0 border-r border-slate-200 bg-white p-4 gap-1"
      :aria-label="t('nav.more')"
    >
      <div class="px-2 pb-4 flex items-center gap-3">
        <BrandMark class="size-10 shrink-0" />
        <div class="min-w-0">
          <div class="text-xl font-bold text-brand-800 leading-tight">Azaria</div>
          <div class="text-sm text-slate-600 truncate">{{ business.current?.name }}</div>
        </div>
      </div>
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="rounded-xl px-3 py-2 min-h-11 flex items-center gap-2 text-slate-700 hover:bg-slate-100"
        active-class="bg-brand-50 text-brand-800 font-semibold"
      >
        <span aria-hidden="true" class="w-5 text-center">{{ tab.icon }}</span>{{ t(tab.labelKey) }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'settings' }"
        class="rounded-xl px-3 py-2 min-h-11 flex items-center gap-2 text-slate-700 hover:bg-slate-100 mt-auto"
        active-class="bg-brand-50 text-brand-800 font-semibold"
      >
        <span aria-hidden="true" class="w-5 text-center">⚙</span>{{ t('nav.settings') }}
      </RouterLink>
    </nav>

    <main class="flex-1 pb-20 md:pb-0 min-w-0">
      <RouterView />
    </main>

    <!-- Mobile bottom navigation: Home · Daybook · Add · Customers · Reports -->
    <nav
      class="no-print md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      :aria-label="t('nav.more')"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="flex flex-col items-center justify-center min-h-16 text-xs text-slate-600"
        active-class="text-brand-800 font-semibold"
      >
        <span
          aria-hidden="true"
          class="text-xl leading-none mb-1"
          :class="tab.primary ? 'bg-brand-700 text-white rounded-full size-10 flex items-center justify-center -mt-5 shadow' : ''"
          >{{ tab.icon }}</span
        >
        {{ t(tab.labelKey) }}
      </RouterLink>
    </nav>
  </div>
</template>
