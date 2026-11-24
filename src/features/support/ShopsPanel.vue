<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import {
  getBillingSettings,
  listShops,
  setShopPayments,
  setShopStatus,
  type DirectoryShop,
  type PaymentsMode,
} from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { friendlyDate } from '@/utils/dates'

const PAGE = 25
const { t, locale } = useI18n()
const router = useRouter()
const business = useBusinessStore()
/** The shop directory: find a shop, open it, set its payments, suspend or reactivate it. */
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
/** The switch for everyone. A shop with no setting of its own follows it. */
const generalOn = ref(false)
const canBill = computed(() => business.can('billing'))
/** Whether this shop is asked to pay right now: its own setting, otherwise the general switch. */
const shopPays = (shop: DirectoryShop) =>
  shop.payments_mode === 'on' || (shop.payments_mode !== 'off' && generalOn.value)

async function changePayments(shop: DirectoryShop, mode: PaymentsMode) {
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

onMounted(() => {
  void load(true)
  // Only an admin with the billing right sees the switches, and only they may read the general one.
  if (canBill.value)
    getBillingSettings()
      .then((s) => (generalOn.value = s.payments_on))
      .catch((e) => (error.value = message(e)))
})
</script>

<template>
  <section class="space-y-4" aria-labelledby="shops-title">
    <h2 id="shops-title" class="sr-only">{{ t('support.shops') }}</h2>
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
        <div v-if="canBill" class="rounded-lg bg-slate-50 px-3 py-1">
          <div class="flex items-center justify-between gap-3">
            <span class="text-slate-900">{{ t('support.shopPayments') }}</span>
            <AppSwitch
              :model-value="shopPays(shop)"
              :label="t('support.shopPaymentsSwitch', { name: shop.name })"
              :state-text="shopPays(shop) ? t('support.shopPays') : t('support.shopFree')"
              @toggle="changePayments(shop, $event ? 'on' : 'off')"
            />
          </div>
          <p v-if="(shop.payments_mode ?? 'default') === 'default'" class="pb-2 text-sm text-slate-600">
            {{ t('support.shopPaymentsDefault') }}
          </p>
          <button
            v-else
            type="button"
            class="min-h-12 text-sm text-brand-700 underline"
            @click="changePayments(shop, 'default')"
          >
            {{ t('support.shopPaymentsFollow') }}
          </button>
        </div>
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
  </section>
</template>
