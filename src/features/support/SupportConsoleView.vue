<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import DiscountCodesPanel from '@/features/support/DiscountCodesPanel.vue'
import PaymentsPanel from '@/features/support/PaymentsPanel.vue'
import AdminsPanel from '@/features/support/AdminsPanel.vue'
import AccountsPanel from '@/features/support/AccountsPanel.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  listShops,
  setShopPayments,
  setShopStatus,
  type DirectoryShop,
  type PaymentsMode,
} from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { dateLocale, friendlyDate } from '@/utils/dates'

const PAGE = 25
const { t, locale } = useI18n()
const router = useRouter()
const business = useBusinessStore()
/** The console has two parts: the shop directory, and discount codes for Azaria Plus. */
type Tab = 'shops' | 'accounts' | 'discounts' | 'payments' | 'admins'
const tab = ref<Tab>('shops')
/** Tabs follow the admin's rights. The database refuses anything the tab would have hidden. */
const tabs = computed<Tab[]>(() => [
  'shops',
  'accounts',
  ...(business.can('billing') ? (['discounts', 'payments'] as const) : []),
  ...(business.superAdmin ? (['admins'] as const) : []),
])
const search = ref('')
const shops = ref<DirectoryShop[]>([])
const hasMore = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
/** The shop whose suspend or reactivate form is open, with the reason being typed. */
const acting = ref<string | null>(null)
const reason = ref('')
const reasonError = ref<string | null>(null)
const busy = ref<string | null>(null)

const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')

async function load(reset: boolean) {
  loading.value = true
  error.value = null
  try {
    const before = reset ? null : (shops.value.at(-1)?.created_at ?? null)
    const rows = await listShops(search.value.trim() || null, before)
    shops.value = reset ? rows : [...shops.value, ...rows]
    hasMore.value = rows.length === PAGE
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

async function open(shop: DirectoryShop, edit: boolean) {
  busy.value = shop.id
  error.value = null
  try {
    await business.openSupport(shop.id, edit)
    await router.push({ name: 'home' })
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

const notice = ref<string | null>(null)
const paymentOptions = computed(() => [
  { value: 'default', label: t('support.shopPaymentsDefault') },
  { value: 'on', label: t('support.shopPaymentsOn') },
  { value: 'off', label: t('support.shopPaymentsOff') },
])

async function changePayments(shop: DirectoryShop, mode: string) {
  if (mode !== 'default' && mode !== 'on' && mode !== 'off') return
  const previous: PaymentsMode = shop.payments_mode ?? 'default'
  if (mode === previous) return
  error.value = null
  notice.value = null
  shop.payments_mode = mode
  try {
    await setShopPayments(shop.id, mode)
    notice.value = t('support.shopPaymentsSaved', { name: shop.name })
  } catch (e) {
    shop.payments_mode = previous
    error.value = message(e)
  }
}

function startAction(shop: DirectoryShop) {
  acting.value = acting.value === shop.id ? null : shop.id
  reason.value = ''
  reasonError.value = null
}

async function confirmStatus(shop: DirectoryShop) {
  reasonError.value = null
  if (reason.value.trim().length < 3) {
    reasonError.value = t('support.reasonNeeded')
    return
  }
  busy.value = shop.id
  try {
    const next = shop.status === 'suspended' ? 'active' : 'suspended'
    await setShopStatus(shop.id, next, reason.value.trim())
    shop.status = next
    acting.value = null
  } catch (e) {
    reasonError.value = message(e)
  } finally {
    busy.value = null
  }
}

const day = (iso: string | null) =>
  iso ? friendlyDate(iso, locale.value, { today: t('app.today'), yesterday: t('app.yesterday') }) : t('support.never')
const time = (iso: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

onMounted(() => void load(true))
</script>

<template>
  <div class="min-h-dvh">
    <PageHeader :title="t('support.console')" />
    <section class="p-4 space-y-4 max-w-2xl mx-auto">
      <AppAlert kind="info">
        {{ t('support.intro') }}
        <RouterLink :to="{ name: 'guide', params: { which: 'admin' } }" class="underline font-semibold">{{
          t('guide.admin')
        }}</RouterLink>
      </AppAlert>
      <div v-if="tabs.length > 1" class="flex flex-wrap gap-2" role="tablist">
        <button
          v-for="name in tabs"
          :key="name"
          type="button"
          role="tab"
          :aria-selected="tab === name"
          class="flex-1 min-h-12 rounded-xl border font-semibold"
          :class="tab === name ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-800 border-brand-200'"
          @click="tab = name"
        >
          {{ t(`support.${name}`) }}
        </button>
      </div>
      <DiscountCodesPanel v-if="tab === 'discounts'" />
      <PaymentsPanel v-else-if="tab === 'payments'" />
      <AdminsPanel v-else-if="tab === 'admins'" />
      <AccountsPanel v-else-if="tab === 'accounts'" />
      <template v-else>
      <form class="flex gap-2 items-end" role="search" @submit.prevent="load(true)">
        <div class="flex-1">
          <AppInput v-model="search" :label="t('support.search')" inputmode="search" autocomplete="off" />
        </div>
        <AppButton type="submit" :loading="loading">{{ t('support.searchAction') }}</AppButton>
      </form>
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
      <p v-if="!loading && !error && shops.length === 0" class="text-slate-600">{{ t('support.none') }}</p>

      <ul class="space-y-3">
        <li v-for="shop in shops" :key="shop.id" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-semibold text-slate-900 truncate">{{ shop.name }}</h2>
              <p class="text-sm text-slate-600 break-all">{{ t('support.owner') }}: {{ shop.owner_email ?? '—' }}</p>
            </div>
            <span
              class="shrink-0 text-xs font-medium rounded-full px-2 py-1"
              :class="shop.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'"
              >{{ shop.status === 'active' ? t('support.statusActive') : t('support.statusSuspended') }}</span
            >
          </div>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt class="text-slate-600">{{ t('support.lastEntry') }}</dt>
            <dd class="text-slate-900">{{ day(shop.last_entry_date) }}</dd>
            <dt class="text-slate-600">{{ t('support.members') }}</dt>
            <dd class="text-slate-900">{{ shop.member_count }} · {{ shop.country_code }} · {{ shop.currency_code }}</dd>
          </dl>
          <p class="text-sm text-slate-600">
            {{
              shop.plus_until && new Date(shop.plus_until) > new Date()
                ? t('support.plusUntil', { date: day(shop.plus_until) })
                : t('support.noPlus')
            }}
          </p>
          <AppSelect
            v-if="business.can('billing')"
            :model-value="shop.payments_mode ?? 'default'"
            :label="t('support.shopPayments')"
            :options="paymentOptions"
            @update:model-value="changePayments(shop, String($event))"
          />
          <div class="flex flex-wrap gap-2">
            <AppButton
              v-if="business.can('view_shops') || business.can('edit_shops')"
              type="button"
              :loading="busy === shop.id"
              @click="open(shop, false)"
            >
              {{ t('support.open') }}
            </AppButton>
            <AppButton
              v-if="business.can('edit_shops')"
              type="button"
              variant="secondary"
              :disabled="busy === shop.id"
              @click="open(shop, true)"
            >
              {{ t('support.openEdit') }}
            </AppButton>
            <AppButton v-if="business.can('suspend_shops')" type="button" variant="secondary" @click="startAction(shop)">
              {{ shop.status === 'suspended' ? t('support.reactivate') : t('support.suspend') }}
            </AppButton>
          </div>
          <form v-if="acting === shop.id" class="space-y-2" novalidate @submit.prevent="confirmStatus(shop)">
            <AppInput v-model="reason" :label="t('support.reason')" required />
            <AppAlert v-if="reasonError" kind="error">{{ reasonError }}</AppAlert>
            <div class="flex gap-2">
              <AppButton
                type="submit"
                :variant="shop.status === 'suspended' ? 'primary' : 'danger'"
                :loading="busy === shop.id"
              >
                {{ t('support.confirm') }}
              </AppButton>
              <AppButton type="button" variant="ghost" @click="acting = null">{{ t('app.cancel') }}</AppButton>
            </div>
          </form>
        </li>
      </ul>
      <AppButton v-if="hasMore" type="button" variant="secondary" block :loading="loading" @click="load(false)">
        {{ t('support.more') }}
      </AppButton>
      </template>
    </section>
  </div>
</template>
