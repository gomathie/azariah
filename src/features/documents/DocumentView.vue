<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BrandMark from '@/components/BrandMark.vue'
import { getDocument, type ShopDocument } from '@/features/documents/api'
import { buildDocumentPdf, downloadPdf } from '@/features/documents/pdf'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const paper = ref<ShopDocument | null>(null)
const error = ref<string | null>(null)
const downloading = ref(false)

const title = computed(() =>
  paper.value ? t(paper.value.kind === 'invoice' ? 'documents.invoice' : 'documents.receipt') : t('documents.title'),
)

watch(
  [() => business.current?.id, () => route.params.documentId],
  async ([id, documentId]) => {
    if (!id || typeof documentId !== 'string') return
    error.value = null
    try {
      paper.value = await getDocument(id, documentId)
    } catch (e) {
      error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
    }
  },
  { immediate: true },
)

function money(minor: number): string {
  return formatMoney(BigInt(minor), paper.value?.currency_code ?? 'GHS', locale.value)
}

async function download() {
  if (!paper.value) return
  downloading.value = true
  error.value = null
  try {
    const logo = await loadLogo()
    const bytes = await buildDocumentPdf(
      paper.value,
      {
        title: title.value,
        customer: t('documents.customer'),
        saleAmount: t('documents.saleAmount'),
        moneyReceived: t('documents.moneyReceived'),
        customerOwes: t('documents.customerOwes'),
        cancelled: t('documents.cancelled'),
        total: money(paper.value.total_minor),
        received: paper.value.kind === 'invoice' ? money(paper.value.received_minor) : null,
        outstanding: paper.value.outstanding_minor > 0 ? money(paper.value.outstanding_minor) : null,
      },
      logo,
    )
    downloadPdf(bytes, `${paper.value.display_number}.pdf`)
  } catch {
    error.value = t('errors.generic')
  } finally {
    downloading.value = false
  }
}

async function loadLogo(): Promise<Uint8Array | undefined> {
  try {
    const response = await fetch('/icons/icon-192.png')
    if (!response.ok) return undefined
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return undefined
  }
}
</script>

<template>
  <PageHeader :title="title" back />
  <section class="p-4 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <article v-if="paper" class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <header class="flex items-center gap-3">
        <BrandMark class="size-12 shrink-0" />
        <div>
          <p class="font-semibold text-slate-900">{{ paper.business_name }}</p>
          <p class="text-sm text-slate-600">{{ title }} · {{ paper.display_number }}</p>
        </div>
      </header>
      <AppAlert v-if="paper.status === 'void'" kind="warning">{{ t('documents.cancelled') }}</AppAlert>
      <p>{{ paper.business_date }}</p>
      <p v-if="paper.contact_name">
        <span class="text-slate-600">{{ t('documents.customer') }}</span><br />{{ paper.contact_name }}
      </p>
      <p v-if="paper.description">{{ paper.description }}</p>
      <p class="text-2xl font-semibold">
        {{ paper.kind === 'invoice' ? t('documents.saleAmount') : t('documents.moneyReceived') }}
        <span class="block">{{ money(paper.total_minor) }}</span>
      </p>
      <p v-if="paper.kind === 'invoice'">
        {{ t('documents.moneyReceived') }}: {{ money(paper.received_minor) }}
      </p>
      <p v-if="paper.outstanding_minor > 0">
        {{ t('documents.customerOwes') }}: {{ money(paper.outstanding_minor) }}
      </p>
    </article>
    <AppButton v-if="paper" class="no-print mt-4" type="button" block :loading="downloading" @click="download">
      {{ t('documents.downloadPdf') }}
    </AppButton>
  </section>
</template>
