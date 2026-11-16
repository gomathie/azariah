<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { getSupabase } from '@/lib/supabase/client'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const business = useBusinessStore()
const catalog = useCatalogStore()
const owed = ref<Record<string, number>>({})
const error = ref<string | null>(null)

watch(
  () => business.current?.id,
  async (id) => {
    if (!id) return
    error.value = null
    try {
      await catalog.load(id)
      const { data, error: queryError } = await getSupabase()
        .from('v_customer_balances')
        .select('contact_id, outstanding_minor')
        .eq('business_id', id)
      if (queryError) throw queryError
      owed.value = Object.fromEntries((data ?? []).map((row) => [row.contact_id, row.outstanding_minor ?? 0]))
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader :title="t('customers.title')" />
  <section class="p-4 space-y-3 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!error && catalog.contacts.length === 0" class="text-slate-600">{{ t('customers.empty') }}</p>
    <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="contact in catalog.contacts" :key="contact.id">
        <RouterLink
          :to="{ name: 'customer-detail', params: { contactId: contact.id } }"
          class="px-4 py-3 flex items-center justify-between gap-3 min-h-14"
        >
          <span class="font-medium text-slate-900">{{ contact.name }}</span>
          <span class="text-slate-700">{{
            (owed[contact.id] ?? 0) > 0
              ? formatMoney(BigInt(owed[contact.id] ?? 0), business.current?.currency_code ?? 'GHS', locale)
              : t('customers.noDebt')
          }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
