<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const business = useBusinessStore()

interface Choice {
  to: RouteLocationRaw
  label: string
  hint: string
  primary?: boolean
}

const role = computed(() => business.current?.role ?? 'viewer')

const everyday = computed<Choice[]>(() => [
  { to: { name: 'add-sale' }, label: t('sale.add'), hint: t('add.saleHint'), primary: true },
  { to: { name: 'add-expense' }, label: t('expense.add'), hint: t('add.expenseHint') },
  { to: { name: 'customers', query: { pay: '1' } }, label: t('collection.record'), hint: t('add.paymentHint') },
])
const money = computed<Choice[]>(() => [
  { to: { name: 'transfer' }, label: t('transfer.title'), hint: t('add.transferHint') },
  // The database lets only an owner or manager record owner money, so staff are not offered it.
  ...(role.value === 'owner' || role.value === 'manager'
    ? [{ to: { name: 'owner-money' }, label: t('owner.title'), hint: t('add.ownerHint') }]
    : []),
])
const papers = computed<Choice[]>(() => [
  { to: { name: 'add-invoice' }, label: t('documents.invoice'), hint: t('add.invoiceHint') },
  { to: { name: 'add-receipt' }, label: t('documents.receipt'), hint: t('add.receiptHint') },
])
const sections = computed(() => [
  { title: t('add.everyday'), items: everyday.value },
  { title: t('add.money'), items: money.value },
  { title: t('add.papers'), items: papers.value },
])
</script>

<template>
  <PageHeader :title="t('nav.add')" />
  <section class="p-4 space-y-5 max-w-lg">
    <div v-for="section in sections" :key="section.title" class="space-y-2">
      <h2 class="text-sm font-semibold text-slate-600 px-1">{{ section.title }}</h2>
      <RouterLink
        v-for="item in section.items"
        :key="item.label"
        :to="item.to"
        class="block rounded-xl px-4 py-3 min-h-14"
        :class="
          item.primary
            ? 'bg-brand-700 text-white hover:bg-brand-800'
            : 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'
        "
      >
        <span class="block font-semibold">{{ item.label }}</span>
        <span class="block text-sm" :class="item.primary ? 'text-brand-100' : 'text-slate-600'">{{ item.hint }}</span>
      </RouterLink>
    </div>
  </section>
</template>
