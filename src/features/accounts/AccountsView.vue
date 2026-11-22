<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { listAccountBalances, type AccountBalance } from '@/features/accounts/api'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const business = useBusinessStore()
const route = useRoute()
const canOwnerMoney = computed(() => business.current?.role === 'owner' || business.current?.role === 'manager')
const rows = ref<AccountBalance[]>([])
const error = ref<string | null>(null)
const currency = computed(() => business.current?.currency_code ?? 'GHS')

watch(
  () => business.current?.id,
  async (id) => {
    if (!id) return
    error.value = null
    try {
      rows.value = await listAccountBalances(id)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader :title="t('accounts.title')" />
  <section class="p-4 space-y-3 max-w-lg">
    <RouterLink
      :to="{ name: 'transfer' }"
      class="block rounded-xl bg-brand-700 text-white font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('accounts.transfer') }}</RouterLink
    >
    <RouterLink
      v-if="canOwnerMoney"
      :to="{ name: 'owner-money' }"
      class="block rounded-xl bg-white border border-brand-200 text-brand-800 font-semibold min-h-14 leading-[3.5rem] text-center"
      >{{ t('owner.title') }}</RouterLink
    >
    <AppAlert v-if="route.query.saved === 'owner'" kind="success">{{ t('owner.saved') }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="row in rows" :key="row.id">
        <RouterLink
          :to="{ name: 'account-statement', params: { accountId: row.id } }"
          class="px-4 py-3 min-h-14 flex items-center justify-between"
        >
          <span class="font-medium">{{ row.name }}</span>
          <span>{{ formatMoney(BigInt(row.balance_minor), currency, locale) }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
