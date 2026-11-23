<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import {
  checkDiscountCode,
  confirmPayment,
  discountedMinor,
  startCheckout,
  startFreePayment,
  startTrial,
  type BillingPayment,
  type DiscountCheck,
} from '@/features/billing/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBillingStore } from '@/stores/billing'
import { useBusinessStore } from '@/stores/business'
import { dateLocale } from '@/utils/dates'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const business = useBusinessStore()
const billing = useBillingStore()

const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const chosen = ref('')
const codeText = ref('')
const codeError = ref<string | null>(null)
const discount = ref<DiscountCheck | null>(null)
const busy = ref<'trial' | 'pay' | 'code' | string | null>(null)

const status = computed(() => billing.status)
const products = computed(() => status.value?.products ?? [])
const product = computed(() => products.value.find((p) => p.code === chosen.value) ?? null)
const percent = computed(() => discount.value?.percent_off ?? 0)
const due = computed(() => (product.value ? discountedMinor(product.value.amount_minor, percent.value) : null))

const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')
const day = (iso: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'long' }).format(new Date(iso))
const money = (minor: number | bigint, currency: string) => formatMoney(BigInt(minor), currency, locale.value)

const statusLine = computed(() => {
  const s = status.value
  if (!s?.plus_until) return t('plus.off')
  const date = day(s.plus_until)
  if (s.in_grace) return t('plus.graceUntil', { date })
  return s.has_plus ? t('plus.onUntil', { date }) : t('plus.ended', { date })
})

async function load() {
  const id = business.current?.id
  if (!id) return
  // Never show one shop's Plus state while another shop's is loading.
  if (billing.businessId !== id) billing.reset()
  loading.value = true
  error.value = null
  try {
    const next = await billing.load(id)
    if (!next.products.some((p) => p.code === chosen.value)) chosen.value = next.products[0]?.code ?? ''
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

async function trial() {
  const id = business.current?.id
  if (!id) return
  busy.value = 'trial'
  error.value = null
  try {
    await startTrial(id)
    notice.value = t('plus.trialStarted')
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

async function applyCode() {
  const id = business.current?.id
  if (!id || !codeText.value.trim()) return
  busy.value = 'code'
  codeError.value = null
  try {
    discount.value = await checkDiscountCode(id, codeText.value.trim())
  } catch (e) {
    discount.value = null
    codeError.value = message(e)
  } finally {
    busy.value = null
  }
}

function removeCode() {
  discount.value = null
  codeText.value = ''
  codeError.value = null
}

async function pay() {
  const id = business.current?.id
  if (!id || !product.value) return
  busy.value = 'pay'
  error.value = null
  notice.value = null
  try {
    if (due.value === 0n && discount.value) {
      // A 100% code: nothing to pay, so there is no trip to Paystack.
      const free = await startFreePayment(id, product.value.code, discount.value.code)
      removeCode()
      await load()
      if (free.status === 'paid') notice.value = t('plus.paidNow')
      else error.value = t('errors.AZ_DISCOUNT_INVALID')
      return
    }
    const result = await startCheckout(id, product.value.code, discount.value?.code ?? null)
    if (result.status === 'paid') {
      notice.value = t('plus.paidNow')
      removeCode()
      await load()
      return
    }
    // Leave the app for Paystack's own page. The address was checked on the server.
    window.location.assign(result.authorization_url)
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

async function check(payment: BillingPayment) {
  busy.value = payment.reference
  error.value = null
  try {
    const result = await confirmPayment(payment.reference)
    if (result.status === 'paid') notice.value = t('plus.paidNow')
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

const statusLabel = (payment: BillingPayment) =>
  t(payment.status === 'paid' ? 'plus.statusPaid' : payment.status === 'failed' ? 'plus.statusFailed' : 'plus.statusPending')

watch(() => business.current?.id, () => void load(), { immediate: true })
</script>

<template>
  <PageHeader :title="t('plus.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <p class="text-slate-700">{{ t('plus.intro') }}</p>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
    <p v-if="loading && !status" class="text-slate-600">{{ t('app.loading') }}</p>

    <template v-if="status">
      <AppAlert :kind="status.in_grace ? 'warning' : status.has_plus ? 'success' : 'info'">{{ statusLine }}</AppAlert>

      <AppAlert v-if="!status.can_pay" kind="info">{{ t('plus.ownerOnly') }}</AppAlert>

      <template v-else>
        <AppButton
          v-if="status.trial_available"
          type="button"
          variant="secondary"
          block
          :loading="busy === 'trial'"
          @click="trial"
        >
          {{ t('plus.trial') }}
        </AppButton>

        <fieldset class="space-y-2">
          <legend class="text-base font-semibold text-slate-900 mb-2">{{ t('plus.choose') }}</legend>
          <label
            v-for="p in products"
            :key="p.code"
            class="flex items-center gap-3 rounded-xl border bg-white px-4 min-h-14 cursor-pointer"
            :class="chosen === p.code ? 'border-brand-600 ring-2 ring-brand-200' : 'border-slate-200'"
          >
            <input v-model="chosen" type="radio" name="plus-period" :value="p.code" class="size-5 accent-brand-700" />
            <span class="flex-1 font-medium text-slate-900">{{ t('plus.months', { n: p.months }, p.months) }}</span>
            <span class="text-right">
              <span class="block font-semibold text-slate-900">{{
                money(discountedMinor(p.amount_minor, percent), p.currency_code)
              }}</span>
              <span v-if="percent > 0" class="block text-sm text-slate-600 line-through">{{
                money(p.amount_minor, p.currency_code)
              }}</span>
            </span>
          </label>
        </fieldset>

        <div v-if="discount" class="space-y-2">
          <AppAlert kind="success">{{ t('plus.codeApplied', { percent: discount.percent_off, code: discount.code }) }}</AppAlert>
          <AppButton type="button" variant="ghost" @click="removeCode">{{ t('plus.removeCode') }}</AppButton>
        </div>
        <form v-else class="flex gap-2 items-end" novalidate @submit.prevent="applyCode">
          <div class="flex-1">
            <AppInput
              v-model="codeText"
              :label="t('plus.code')"
              :hint="t('plus.codeHint')"
              :error="codeError"
              autocomplete="off"
              :maxlength="24"
            />
          </div>
          <AppButton type="submit" variant="secondary" :loading="busy === 'code'" class="mb-6">
            {{ t('plus.applyCode') }}
          </AppButton>
        </form>

        <AppButton
          v-if="product && due !== null"
          type="button"
          size="lg"
          block
          :loading="busy === 'pay'"
          @click="pay"
        >
          {{ due === 0n ? t('plus.payFree') : t('plus.pay', { price: money(due, product.currency_code) }) }}
        </AppButton>
        <p v-if="due !== 0n" class="text-sm text-slate-600">{{ t('plus.payHint') }} {{ t('plus.privacy') }}</p>
      </template>

      <template v-if="status.payments.length">
        <h2 class="text-base font-semibold text-slate-900 pt-2">{{ t('plus.history') }}</h2>
        <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
          <li v-for="payment in status.payments" :key="payment.reference" class="px-4 py-3 space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="block text-slate-900">{{ t('plus.months', { n: payment.months }, payment.months) }}</span>
                <span class="block text-sm text-slate-600">{{ day(payment.paid_at ?? payment.created_at) }}</span>
              </div>
              <div class="text-right">
                <span class="block font-medium text-slate-900">{{ money(payment.amount_minor, payment.currency_code) }}</span>
                <span class="block text-sm" :class="payment.status === 'paid' ? 'text-emerald-800' : 'text-slate-600'">{{
                  statusLabel(payment)
                }}</span>
              </div>
            </div>
            <AppButton
              v-if="payment.status === 'pending' && status.can_pay"
              type="button"
              variant="secondary"
              :loading="busy === payment.reference"
              @click="check(payment)"
            >
              {{ t('plus.check') }}
            </AppButton>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
