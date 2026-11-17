<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { getTransaction, reverseTransaction, type DaybookRow } from '@/features/daybook/api'
import { issueDocument } from '@/features/documents/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()
const row = ref<DaybookRow | null>(null)
const reason = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const paperLoading = ref(false)
const canReverse = computed(
  () =>
    row.value?.status === 'posted' &&
    (business.current?.role === 'owner' || business.current?.role === 'manager'),
)

watch(
  [() => business.current?.id, () => route.params.transactionId],
  async ([id, transactionId]) => {
    if (!id || typeof transactionId !== 'string') return
    error.value = null
    try {
      row.value = await getTransaction(id, transactionId)
    } catch {
      error.value = t('errors.generic')
    }
  },
  { immediate: true },
)

async function makePaper(kind: 'invoice' | 'receipt') {
  const current = business.current
  const transactionId = route.params.transactionId
  if (!current || typeof transactionId !== 'string') return
  paperLoading.value = true
  error.value = null
  try {
    const paper = await issueDocument(current.id, transactionId, kind)
    await router.push({ name: 'document', params: { documentId: paper.document_id } })
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    paperLoading.value = false
  }
}

async function reverse() {
  const current = business.current
  const transactionId = route.params.transactionId
  if (!current || typeof transactionId !== 'string' || reason.value.trim().length === 0) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  error.value = null
  try {
    await reverseTransaction(current.id, transactionId, reason.value.trim())
    row.value = await getTransaction(current.id, transactionId)
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageHeader :title="row ? t(`daybook.kinds.${row.kind}`) : t('daybook.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <template v-if="row">
      <p class="text-2xl font-semibold">
        {{ formatMoney(BigInt(row.amount_minor), business.current?.currency_code ?? 'GHS', locale) }}
      </p>
      <p>{{ row.business_date }}</p>
      <p v-if="row.description">{{ row.description }}</p>
      <AppAlert v-if="row.status === 'reversed'" kind="warning">{{ t('daybook.reversed') }}</AppAlert>
      <div v-if="row.status === 'posted' && (row.kind === 'sale' || row.kind === 'collection')" class="space-y-2">
        <AppButton
          v-if="row.kind === 'sale'"
          type="button"
          block
          :loading="paperLoading"
          @click="makePaper('invoice')"
          >{{ t('documents.makeInvoice') }}</AppButton
        >
        <AppButton
          type="button"
          block
          variant="secondary"
          :loading="paperLoading"
          @click="makePaper('receipt')"
          >{{ t('documents.makeReceipt') }}</AppButton
        >
      </div>
      <form v-if="canReverse" class="space-y-3" @submit.prevent="reverse">
        <AppInput v-model="reason" :label="t('daybook.reverseReason')" />
        <AppButton type="submit" variant="danger" :loading="loading">{{ t('daybook.reverse') }}</AppButton>
      </form>
    </template>
  </section>
</template>
