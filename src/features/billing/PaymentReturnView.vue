<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { confirmPayment, isPaymentReference } from '@/features/billing/api'
import { RpcError } from '@/lib/supabase/rpc'
import { dateLocale } from '@/utils/dates'

/**
 * Paystack sends the owner back here with "?reference=…". The address bar proves nothing: the
 * server asks Paystack what happened to that reference before Plus changes.
 */
const { t, locale } = useI18n()
const route = useRoute()
const state = ref<'checking' | 'paid' | 'pending' | 'failed' | 'unknown' | 'error'>('checking')
const until = ref<string | null>(null)
const error = ref<string | null>(null)

const candidate = route.query.reference ?? route.query.trxref
const reference = isPaymentReference(candidate) ? candidate : null

const day = (iso: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'long' }).format(new Date(iso))

async function check() {
  if (!reference) {
    state.value = 'unknown'
    return
  }
  state.value = 'checking'
  error.value = null
  try {
    const result = await confirmPayment(reference)
    until.value = result.plus_until ?? null
    state.value = result.status
  } catch (e) {
    if (e instanceof RpcError && e.code === 'AZ_NOT_FOUND') {
      state.value = 'unknown'
      return
    }
    state.value = 'error'
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  }
}

onMounted(() => void check())
</script>

<template>
  <PageHeader :title="t('plus.returnTitle')" />
  <section class="p-4 space-y-4 max-w-lg" aria-live="polite">
    <p v-if="state === 'checking'" class="text-slate-700">{{ t('plus.checking') }}</p>
    <AppAlert v-else-if="state === 'paid'" kind="success">
      {{ until ? t('plus.returnPaid', { date: day(until) }) : t('plus.paidNow') }}
    </AppAlert>
    <AppAlert v-else-if="state === 'pending'" kind="warning">{{ t('plus.returnPending') }}</AppAlert>
    <AppAlert v-else-if="state === 'failed'" kind="error">{{ t('plus.returnFailed') }}</AppAlert>
    <AppAlert v-else-if="state === 'unknown'" kind="error">{{ t('plus.returnUnknown') }}</AppAlert>
    <AppAlert v-else kind="error">{{ error }}</AppAlert>

    <AppButton v-if="state === 'pending' || state === 'error'" type="button" block @click="check">
      {{ t('plus.check') }}
    </AppButton>
    <RouterLink
      :to="{ name: 'plus' }"
      class="block rounded-xl border border-brand-200 bg-white text-brand-800 font-semibold min-h-12 leading-[3rem] text-center"
      >{{ t('plus.back') }}</RouterLink
    >
  </section>
</template>
