<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { getCustomerStatement, type StatementRow } from '@/features/customers/api'
import { getSupabase } from '@/lib/supabase/client'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const name = ref('')
const phone = ref<string | null>(null)
const rows = ref<StatementRow[]>([])
const error = ref<string | null>(null)

const contactId = computed(() => String(route.params.contactId))
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const outstanding = computed(() => rows.value.at(-1)?.balance_minor ?? 0)
const reminder = computed(() =>
  t('customers.reminderText', {
    name: name.value,
    amount: formatMoney(BigInt(outstanding.value), currency.value, locale.value),
    business: business.current?.name ?? '',
  }),
)
const whatsAppHref = computed(() => {
  const digits = (phone.value ?? '').replace(/\D/g, '')
  // Only digits reach the link, and only a plausible phone length, so a stored value cannot become a different URL.
  if (digits.length < 7 || digits.length > 15) return ''
  return `https://wa.me/${digits}?text=${encodeURIComponent(reminder.value)}`
})

watch(
  [() => business.current?.id, contactId],
  async ([businessId]) => {
    if (!businessId) return
    error.value = null
    try {
      const { data, error: contactError } = await getSupabase()
        .from('contacts')
        .select('name, phone')
        .eq('id', contactId.value)
        .eq('business_id', businessId)
        .maybeSingle()
      if (contactError) throw contactError
      name.value = data?.name ?? ''
      phone.value = data?.phone ?? null
      rows.value = await getCustomerStatement(businessId, contactId.value)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader :title="name || t('customers.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <AppAlert v-if="route.query.saved === 'payment'" kind="success">{{ t('collection.saved') }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p class="text-slate-700">
      {{ t('customers.stillOwes') }}:
      {{ formatMoney(BigInt(outstanding), currency, locale) }}
    </p>
    <RouterLink
      :to="{ name: 'record-payment', params: { contactId } }"
      class="block rounded-xl bg-brand-700 text-white font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('collection.record') }}</RouterLink
    >
    <h2 class="text-base font-semibold text-slate-900">{{ t('customers.statement') }}</h2>
    <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="(row, index) in rows" :key="index" class="px-4 py-3 text-sm">
        <span class="block text-slate-500">{{ row.date }}</span>
        <span class="block text-slate-900">{{ row.description || t(`daybook.kinds.${row.kind}`) }}</span>
        <span v-if="row.debit_minor > 0" class="block">{{ t('customers.added') }}: {{ formatMoney(BigInt(row.debit_minor), currency, locale) }}</span>
        <span v-if="row.credit_minor > 0" class="block">{{ t('customers.paid') }}: {{ formatMoney(BigInt(row.credit_minor), currency, locale) }}</span>
        <span class="block">{{ t('customers.stillOwes') }}: {{ formatMoney(BigInt(row.balance_minor), currency, locale) }}</span>
      </li>
    </ul>
    <p class="text-sm text-slate-600">{{ reminder }}</p>
    <a v-if="whatsAppHref" :href="whatsAppHref" class="inline-block py-3 text-brand-800 underline" target="_blank" rel="noopener">{{
      t('customers.remind')
    }}</a>
  </section>
</template>
