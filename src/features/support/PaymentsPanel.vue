<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import {
  getBillingSettings,
  setPaymentsOn,
  updateBillingProduct,
  type AdminBillingProduct,
} from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'
import { minorForRpc, parseMoney, toMajorString } from '@/utils/money'

/**
 * The one switch for all payments, and the price of each plan.
 * Only a platform admin reaches this; the database checks again on every call.
 */
const { t } = useI18n()
/** Plan prices are kept in hundredths (pesewas for GHS). */
const MINOR_UNIT = 2

const loaded = ref(false)
const paymentsOn = ref(false)
const products = ref<AdminBillingProduct[]>([])
const prices = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const confirming = ref(false)
const busy = ref<string | null>(null)

const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')

async function load() {
  error.value = null
  try {
    const settings = await getBillingSettings()
    paymentsOn.value = settings.payments_on
    products.value = settings.products
    prices.value = Object.fromEntries(settings.products.map((p) => [p.code, toMajorString(p.amount_minor, MINOR_UNIT)]))
    loaded.value = true
  } catch (e) {
    error.value = message(e)
  }
}

async function switchPayments() {
  busy.value = 'switch'
  error.value = null
  notice.value = null
  try {
    const next = !paymentsOn.value
    await setPaymentsOn(next)
    paymentsOn.value = next
    confirming.value = false
    notice.value = next ? t('support.paymentsNowOn') : t('support.paymentsNowOff')
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

async function save(product: AdminBillingProduct, active: boolean) {
  error.value = null
  notice.value = null
  const amount = parseMoney(prices.value[product.code] ?? '', MINOR_UNIT)
  if (amount === null || amount < 1n) {
    error.value = t('support.planPriceInvalid')
    return
  }
  busy.value = product.code
  try {
    await updateBillingProduct(product.code, minorForRpc(amount), active)
    notice.value = t('support.planSaved')
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

onMounted(() => void load())
</script>

<template>
  <section class="space-y-4" aria-labelledby="payments-title">
    <h2 id="payments-title" class="sr-only">{{ t('support.payments') }}</h2>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
    <p v-if="!loaded && !error" class="text-slate-600">{{ t('app.loading') }}</p>

    <template v-if="loaded">
      <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p class="text-lg font-semibold" :class="paymentsOn ? 'text-emerald-800' : 'text-slate-900'">
          {{ paymentsOn ? t('support.paymentsOn') : t('support.paymentsOff') }}
        </p>
        <p class="text-slate-700">{{ paymentsOn ? t('support.paymentsOnHelp') : t('support.paymentsOffHelp') }}</p>
        <!-- The switch touches every shop, so a tap asks first and the switch moves only after "Yes". -->
        <AppSwitch
          :model-value="paymentsOn"
          :label="paymentsOn ? t('support.paymentsTurnOff') : t('support.paymentsTurnOn')"
          :state-text="paymentsOn ? t('support.stats.on') : t('support.stats.off')"
          :disabled="confirming"
          @toggle="confirming = true"
        />
        <div v-if="confirming" class="space-y-2">
          <AppAlert kind="warning">
            {{ paymentsOn ? t('support.paymentsConfirmOff') : t('support.paymentsConfirmOn') }}
          </AppAlert>
          <div class="flex gap-2">
            <AppButton type="button" :loading="busy === 'switch'" @click="switchPayments">
              {{ paymentsOn ? t('support.paymentsYesOff') : t('support.paymentsYesOn') }}
            </AppButton>
            <AppButton type="button" variant="ghost" @click="confirming = false">{{ t('app.cancel') }}</AppButton>
          </div>
        </div>
      </div>

      <h3 class="text-base font-semibold text-slate-900 pt-2">{{ t('support.plans') }}</h3>
      <p class="text-slate-700">{{ t('support.plansHelp') }}</p>
      <ul class="space-y-3">
        <li v-for="p in products" :key="p.code" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p class="font-semibold text-slate-900">
            {{ t('plus.months', { n: p.months }, p.months) }}
            <span v-if="!p.active" class="font-medium text-red-800"> · {{ t('support.planNotOffered') }}</span>
          </p>
          <AppInput
            v-model="prices[p.code]"
            :label="t('support.planPrice', { currency: p.currency_code })"
            inputmode="decimal"
            :maxlength="12"
          />
          <div class="flex flex-wrap gap-2">
            <AppButton type="button" :loading="busy === p.code" @click="save(p, p.active)">
              {{ t('support.planSave') }}
            </AppButton>
            <AppButton type="button" variant="secondary" :disabled="busy === p.code" @click="save(p, !p.active)">
              {{ p.active ? t('support.planStop') : t('support.planOffer') }}
            </AppButton>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>
