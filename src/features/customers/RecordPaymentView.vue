<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import { getCustomerStatement, recordCollection } from '@/features/customers/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()

const contactId = computed(() => String(route.params.contactId))
const amount = ref<bigint | null>(null)
const accountId = ref('')
const note = ref('')
const when = ref(nowLocalInput())
const outstanding = ref(0n)
const debtReady = ref<Promise<void> | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const minorUnit = computed(() => business.current?.minor_unit ?? 2)

watch(
  () => business.current?.id,
  (id) => {
    if (!id) return
    debtReady.value = (async () => {
      await catalog.load(id)
      if (!accountId.value && catalog.accounts[0]) accountId.value = catalog.accounts[0].id
      const rows = await getCustomerStatement(id, contactId.value)
      outstanding.value = BigInt(rows.at(-1)?.balance_minor ?? 0)
    })().catch(() => {
      error.value = t('errors.generic')
    })
  },
  { immediate: true },
)

/**
 * A payment above the debt is never saved; the database refuses it too (AZ_EXCEEDS_DEBT).
 * Two questions, not a bare error, so the person sees what they typed against what is owed
 * and picks what they meant: fix the amount, record only the debt, or add the sale they forgot.
 */
const overStep = ref<0 | 1 | 2>(0)
const overPanel = ref<HTMLElement | null>(null)
const customerName = computed(
  () => catalog.contacts.find((c) => c.id === contactId.value)?.name ?? t('collection.theCustomer'),
)
const money = (minor: bigint) => formatMoney(minor, currency.value, locale.value)
const overWords = computed(() => ({
  name: customerName.value,
  owed: money(outstanding.value),
  typed: money(amount.value ?? 0n),
  extra: money((amount.value ?? 0n) - outstanding.value),
}))

async function showOver(step: 1 | 2) {
  overStep.value = step
  await nextTick()
  overPanel.value?.focus()
}

async function submit() {
  error.value = null
  const current = business.current
  if (!current || amount.value === null) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (debtReady.value) await debtReady.value
  if (!accountId.value && catalog.accounts[0]) accountId.value = catalog.accounts[0].id
  if (!accountId.value) {
    error.value = t('errors.required')
    return
  }
  if (amount.value > outstanding.value) {
    await showOver(1)
    return
  }
  await save(amount.value)
}

async function save(amountMinor: bigint) {
  const current = business.current
  if (!current) return
  overStep.value = 0
  loading.value = true
  try {
    await recordCollection({
      clientOperationId: crypto.randomUUID(),
      businessId: current.id,
      occurredAt: new Date(when.value).toISOString(),
      contactId: contactId.value,
      amountMinor,
      moneyAccountId: accountId.value,
      note: note.value.trim() || null,
    })
    await router.push({ name: 'customer-detail', params: { contactId: contactId.value }, query: { saved: 'payment' } })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}

function nowLocalInput(): string {
  const date = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
</script>

<template>
  <PageHeader :title="t('collection.record')" back />
  <form class="p-4 space-y-4 max-w-lg" @submit.prevent="submit">
    <p class="text-slate-700">
      {{ t('collection.outstanding') }}: {{ formatMoney(outstanding, currency, locale) }}
    </p>
    <MoneyInput v-model="amount" :label="t('collection.amount')" :currency="currency" :minor-unit="minorUnit" />
    <AppSelect
      v-model="accountId"
      :label="t('collection.account')"
      :options="catalog.accounts.map((a) => ({ value: a.id, label: a.name }))"
    />
    <AppInput v-model="when" :label="t('sale.when')" type="datetime-local" />
    <AppInput v-model="note" :label="t('collection.note')" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppButton type="submit" block size="lg" :loading="loading">{{ t('app.save') }}</AppButton>
  </form>

  <div
    v-if="overStep"
    class="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
    @keydown.esc="overStep = 0"
  >
    <div
      ref="overPanel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="over-title"
      tabindex="-1"
      class="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-xl outline-none"
    >
      <p class="text-sm text-slate-600">{{ t('collection.overStep', { n: overStep }) }}</p>
      <template v-if="overStep === 1">
        <h2 id="over-title" class="text-lg font-semibold text-slate-900">{{ t('collection.overQ1', overWords) }}</h2>
        <p class="text-slate-700">
          {{ outstanding > 0n ? t('collection.overOwes', overWords) : t('collection.overOwesNothing', overWords) }}
          {{ t('collection.overTyped', overWords) }}
        </p>
        <AppButton block @click="overStep = 0">{{ t('collection.overFix') }}</AppButton>
        <AppButton block variant="secondary" @click="showOver(2)">{{ t('collection.overYes', overWords) }}</AppButton>
      </template>
      <template v-else>
        <h2 id="over-title" class="text-lg font-semibold text-slate-900">{{ t('collection.overQ2', overWords) }}</h2>
        <p class="text-slate-700">{{ t('collection.overWhy') }}</p>
        <AppButton v-if="outstanding > 0n" block @click="save(outstanding)">
          {{ t('collection.overOnlyOwed', overWords) }}
        </AppButton>
        <AppButton block variant="secondary" @click="router.push({ name: 'add-sale' })">
          {{ t('collection.overNewSale') }}
        </AppButton>
        <AppButton block variant="ghost" @click="overStep = 0">{{ t('collection.overBack') }}</AppButton>
      </template>
    </div>
  </div>
</template>
