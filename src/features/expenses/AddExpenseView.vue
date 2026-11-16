<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import { createExpense } from '@/features/expenses/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'

const { t } = useI18n()
const router = useRouter()
const business = useBusinessStore()
const catalog = useCatalogStore()

const kind = ref<'operating' | 'stock'>('operating')
const amount = ref<bigint | null>(null)
const accountId = ref('')
const categoryId = ref('')
const description = ref('')
const note = ref('')
const when = ref(nowLocalInput())
const error = ref<string | null>(null)
const loading = ref(false)

const minorUnit = computed(() => business.current?.minor_unit ?? 2)
const currency = computed(() => business.current?.currency_code ?? 'GHS')
const categoryKind = computed(() => (kind.value === 'stock' ? 'stock_purchase' : 'operating_expense'))
const categories = computed(() => catalog.categories.filter((c) => c.kind === categoryKind.value))

watch(
  () => business.current?.id,
  (id) => {
    if (id) void catalog.load(id)
  },
  { immediate: true },
)
watch(
  () => catalog.accounts,
  (accounts) => {
    if (!accountId.value && accounts[0]) accountId.value = accounts[0].id
  },
  { immediate: true },
)
watch(categories, (list) => {
  if (!list.some((c) => c.id === categoryId.value)) categoryId.value = list[0]?.id ?? ''
})

async function submit() {
  error.value = null
  const current = business.current
  if (!current || amount.value === null) {
    error.value = t('errors.invalid_amount')
    return
  }
  if (!accountId.value || !categoryId.value) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  try {
    await createExpense(
      {
        clientOperationId: crypto.randomUUID(),
        businessId: current.id,
        occurredAt: new Date(when.value).toISOString(),
        amountMinor: amount.value,
        moneyAccountId: accountId.value,
        categoryId: categoryId.value,
        description: description.value.trim() || null,
        note: note.value.trim() || null,
      },
      kind.value,
    )
    await router.push({ name: 'daybook', query: { saved: 'expense' } })
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
  <PageHeader :title="t('expense.add')" back />
  <form class="p-4 space-y-4 max-w-lg" @submit.prevent="submit">
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-slate-700">{{ t('expense.kind') }}</legend>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="kind" type="radio" value="operating" name="spend-kind" />
        <span>{{ t('expense.operating') }} — {{ t('expense.operatingHint') }}</span>
      </label>
      <label class="flex items-center gap-2 min-h-12">
        <input v-model="kind" type="radio" value="stock" name="spend-kind" />
        <span>{{ t('expense.stock') }} — {{ t('expense.stockHint') }}</span>
      </label>
    </fieldset>
    <MoneyInput v-model="amount" :label="t('expense.amount')" :currency="currency" :minor-unit="minorUnit" />
    <AppSelect v-model="accountId" :label="t('expense.account')" :options="catalog.accounts.map((a) => ({ value: a.id, label: a.name }))" />
    <AppSelect v-model="categoryId" :label="t('expense.category')" :options="categories.map((c) => ({ value: c.id, label: c.name }))" />
    <AppInput v-model="description" :label="t('expense.description')" />
    <AppInput v-model="when" :label="t('expense.when')" type="datetime-local" />
    <AppInput v-model="note" :label="t('sale.note')" />
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppButton type="submit" block size="lg" :loading="loading">{{ t('app.save') }}</AppButton>
  </form>
</template>
