<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AccountsPanel from '@/features/support/AccountsPanel.vue'
import AdminsPanel from '@/features/support/AdminsPanel.vue'
import DiscountCodesPanel from '@/features/support/DiscountCodesPanel.vue'
import OverviewPanel from '@/features/support/OverviewPanel.vue'
import PaymentsPanel from '@/features/support/PaymentsPanel.vue'
import ShopsPanel from '@/features/support/ShopsPanel.vue'
import { useBusinessStore } from '@/stores/business'

/**
 * The admin console: an overview, then one section each for shops, accounts, discount codes,
 * payments and the team. Sections follow the admin's rights; the database refuses anything a
 * hidden section would have done.
 */
type Section = 'overview' | 'shops' | 'accounts' | 'discounts' | 'payments' | 'admins'
const ICONS = {
  overview: 'home',
  shops: 'book',
  accounts: 'people',
  discounts: 'sale',
  payments: 'payment',
  admins: 'owner',
} as const satisfies Record<Section, string>

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const sections = computed<Section[]>(() => [
  'overview',
  'shops',
  'accounts',
  ...(business.can('billing') ? (['discounts', 'payments'] as const) : []),
  ...(business.superAdmin ? (['admins'] as const) : []),
])

/** The open section lives in the address, so Back and reload keep the admin where they were. */
const section = computed<Section>(() => {
  const wanted = route.query.section
  return typeof wanted === 'string' && (sections.value as string[]).includes(wanted) ? (wanted as Section) : 'overview'
})

function go(next: Section) {
  void router.push({ name: 'support-console', query: next === 'overview' ? {} : { section: next } })
}
</script>

<template>
  <div class="min-h-dvh bg-slate-50 md:flex">
    <!-- Computer: navigation at the side -->
    <aside class="no-print hidden md:flex w-60 shrink-0 flex-col gap-1 bg-brand-900 text-white p-4 sticky top-0 h-dvh">
      <div class="flex items-center gap-3 px-2 pb-4">
        <BrandMark class="size-9 shrink-0" />
        <span class="font-semibold leading-tight">{{ t('support.console') }}</span>
      </div>
      <nav class="flex flex-col gap-1" role="tablist" :aria-label="t('support.console')">
        <button
          v-for="name in sections"
          :key="name"
          type="button"
          role="tab"
          :aria-selected="section === name"
          class="flex items-center gap-3 rounded-xl px-3 min-h-11 text-left"
          :class="section === name ? 'bg-white text-brand-900 font-semibold' : 'text-brand-50 hover:bg-brand-800'"
          @click="go(name)"
        >
          <AppIcon :name="ICONS[name]" class="size-5 shrink-0" />{{ t(`support.${name}`) }}
        </button>
      </nav>
      <div class="mt-auto flex flex-col gap-1 text-sm">
        <RouterLink
          :to="{ name: 'guide', params: { which: 'admin' } }"
          class="rounded-xl px-3 min-h-11 flex items-center text-brand-50 hover:bg-brand-800"
          >{{ t('guide.admin') }}</RouterLink
        >
        <RouterLink
          v-if="business.businesses.length"
          :to="{ name: 'home' }"
          class="rounded-xl px-3 min-h-11 flex items-center text-brand-50 hover:bg-brand-800"
          >{{ t('support.myShop') }}</RouterLink
        >
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <PageHeader :title="t('support.console')" />

      <!-- Phone: the same navigation as a row that scrolls sideways inside itself -->
      <nav
        class="no-print md:hidden sticky top-[61px] z-10 bg-white border-b border-slate-200 overflow-x-auto"
        role="tablist"
        :aria-label="t('support.console')"
      >
        <div class="flex gap-2 px-4 py-2 w-max">
          <button
            v-for="name in sections"
            :key="name"
            type="button"
            role="tab"
            :aria-selected="section === name"
            class="flex items-center gap-2 rounded-full border px-4 min-h-11 whitespace-nowrap font-medium"
            :class="
              section === name ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-200'
            "
            @click="go(name)"
          >
            <AppIcon :name="ICONS[name]" class="size-4 shrink-0" />{{ t(`support.${name}`) }}
          </button>
        </div>
      </nav>

      <main class="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <header class="space-y-1">
          <p class="text-2xl font-semibold text-slate-900">{{ t(`support.${section}`) }}</p>
          <p class="text-slate-600">{{ t(`support.about.${section}`) }}</p>
        </header>

        <OverviewPanel
          v-if="section === 'overview'"
          :can-billing="business.can('billing')"
          :can-team="business.superAdmin"
          @go="go"
        />
        <ShopsPanel v-else-if="section === 'shops'" />
        <AccountsPanel v-else-if="section === 'accounts'" />
        <DiscountCodesPanel v-else-if="section === 'discounts'" />
        <PaymentsPanel v-else-if="section === 'payments'" />
        <AdminsPanel v-else-if="section === 'admins'" />

        <p class="md:hidden text-sm pt-2">
          <RouterLink :to="{ name: 'guide', params: { which: 'admin' } }" class="underline font-semibold text-brand-800">{{
            t('guide.admin')
          }}</RouterLink>
        </p>
      </main>
    </div>
  </div>
</template>
