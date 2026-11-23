<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import { getOverview, type AdminOverview } from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'

/** The first screen of the admin console: counts only, each one a shortcut to its section. */
const emit = defineEmits<{ go: [section: 'shops' | 'accounts' | 'payments' | 'admins'] }>()
defineProps<{ canBilling: boolean; canTeam: boolean }>()
const { t, locale } = useI18n()
const overview = ref<AdminOverview | null>(null)
const error = ref<string | null>(null)

const number = (n: number) => new Intl.NumberFormat(locale.value).format(n)

interface Card {
  key: string
  label: string
  value: string
  note?: string
  tone?: 'good' | 'warn'
  to: 'shops' | 'accounts' | 'payments' | 'admins'
}

const cards = computed<Card[]>(() => {
  const o = overview.value
  if (!o) return []
  return [
    {
      key: 'shops',
      label: t('support.stats.shops'),
      value: number(o.shops_total),
      note: t('support.stats.thisWeek', { n: number(o.shops_new_7d) }),
      to: 'shops',
    },
    {
      key: 'active',
      label: t('support.stats.activeShops'),
      value: number(o.shops_active_7d),
      note: t('support.stats.activeShopsNote'),
      tone: 'good',
      to: 'shops',
    },
    {
      key: 'suspended',
      label: t('support.stats.suspended'),
      value: number(o.shops_suspended),
      tone: o.shops_suspended > 0 ? 'warn' : undefined,
      to: 'shops',
    },
    {
      key: 'accounts',
      label: t('support.stats.accounts'),
      value: number(o.accounts_total),
      note: t('support.stats.thisWeek', { n: number(o.accounts_new_7d) }),
      to: 'accounts',
    },
    {
      key: 'noShop',
      label: t('support.stats.noShop'),
      value: number(o.accounts_no_shop),
      note: t('support.stats.noShopNote'),
      to: 'accounts',
    },
    {
      key: 'paid',
      label: t('support.stats.paid'),
      value: number(o.shops_paid),
      to: 'payments',
    },
    {
      key: 'payments',
      label: t('support.stats.payments'),
      value: o.payments_on ? t('support.stats.on') : t('support.stats.off'),
      note: o.payments_on ? t('support.stats.paymentsOnNote') : t('support.stats.paymentsOffNote'),
      tone: o.payments_on ? 'good' : undefined,
      to: 'payments',
    },
    {
      key: 'team',
      label: t('support.stats.team'),
      value: number(o.team),
      to: 'admins',
    },
  ]
})

onMounted(async () => {
  try {
    overview.value = await getOverview()
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')
  }
})
</script>

<template>
  <section class="space-y-4" aria-labelledby="overview-title">
    <h2 id="overview-title" class="sr-only">{{ t('support.overview') }}</h2>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!overview && !error" class="text-slate-600">{{ t('app.loading') }}</p>
    <ul v-if="overview" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <li v-for="card in cards" :key="card.key">
        <component
          :is="(card.to === 'payments' && !canBilling) || (card.to === 'admins' && !canTeam) ? 'div' : 'button'"
          type="button"
          class="w-full h-full text-left rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-1 min-h-28"
          :class="{ 'hover:border-brand-500 hover:shadow-sm transition': !((card.to === 'payments' && !canBilling) || (card.to === 'admins' && !canTeam)) }"
          @click="
            (card.to === 'payments' && !canBilling) || (card.to === 'admins' && !canTeam) ? undefined : emit('go', card.to)
          "
        >
          <span class="text-sm text-slate-600">{{ card.label }}</span>
          <span
            class="text-3xl font-semibold tabular-nums"
            :class="card.tone === 'good' ? 'text-emerald-800' : card.tone === 'warn' ? 'text-red-800' : 'text-slate-900'"
            >{{ card.value }}</span
          >
          <span v-if="card.note" class="text-sm text-slate-600">{{ card.note }}</span>
        </component>
      </li>
    </ul>
  </section>
</template>
