<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { getSupabase } from '@/lib/supabase/client'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore, type CatalogContact } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const route = useRoute()
const business = useBusinessStore()
const catalog = useCatalogStore()
const owed = ref<Record<string, number>>({})
const error = ref<string | null>(null)

/** null = form closed, 'new' = adding, otherwise the id of the customer being edited. */
const editing = ref<string | null>(null)
const saving = ref(false)
const name = ref('')
const phone = ref('')
const formError = ref<string | null>(null)
const saved = ref<string | null>(null)
const formEl = ref<HTMLFormElement | null>(null)

// Viewers can read the customer book but the database refuses their writes, so add and edit are not offered.
const canWrite = computed(() => business.current?.role !== 'viewer')
// Arriving from "Record payment" in the Add menu: tapping a customer goes straight to the payment screen.
const payMode = computed(() => route.query.pay === '1')
const currency = computed(() => business.current?.currency_code ?? 'GHS')

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
      error.value = navigator.onLine ? t('errors.generic') : t('errors.network')
    }
  },
  { immediate: true },
)

async function openForm(contact: CatalogContact | null) {
  saved.value = null
  formError.value = null
  editing.value = contact ? contact.id : 'new'
  name.value = contact?.name ?? ''
  phone.value = contact?.phone ?? ''
  await nextTick()
  formEl.value?.scrollIntoView?.({ block: 'nearest' })
  formEl.value?.querySelector('input')?.focus()
}

function closeForm() {
  editing.value = null
  formError.value = null
}

async function save() {
  formError.value = null
  saved.value = null
  const cleanName = name.value.trim()
  const cleanPhone = phone.value.trim() || null
  if (!cleanName) {
    formError.value = t('errors.required')
    return
  }
  if (cleanName.length > 120) {
    formError.value = t('customers.nameTooLong')
    return
  }
  const clash = catalog.contacts.some(
    (c) => c.id !== editing.value && c.name.toLowerCase() === cleanName.toLowerCase(),
  )
  if (clash) {
    formError.value = t('customers.duplicate')
    return
  }
  saving.value = true
  try {
    if (editing.value === 'new') {
      await catalog.addContact(cleanName, cleanPhone)
      saved.value = t('customers.savedOne', { name: cleanName })
    } else if (editing.value) {
      await catalog.updateContact(editing.value, cleanName, cleanPhone)
      saved.value = t('customers.updated', { name: cleanName })
    }
    editing.value = null
  } catch {
    formError.value = navigator.onLine ? t('errors.generic') : t('errors.network')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader :title="t('customers.title')" />
  <section class="p-4 space-y-3 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="payMode" kind="info">{{ t('customers.choosePayer') }}</AppAlert>
    <AppAlert v-if="saved" kind="success">{{ saved }}</AppAlert>

    <AppButton v-if="canWrite && editing === null" type="button" block @click="openForm(null)">
      {{ t('customers.add') }}
    </AppButton>

    <form
      v-if="editing !== null"
      ref="formEl"
      class="space-y-3 bg-white rounded-xl border border-brand-200 p-4"
      novalidate
      @submit.prevent="save"
    >
      <h2 class="font-semibold text-slate-900">
        {{ editing === 'new' ? t('customers.add') : t('customers.editTitle') }}
      </h2>
      <AppInput v-model="name" :label="t('customers.name')" autocomplete="off" required />
      <AppInput
        v-model="phone"
        :label="t('customers.phone')"
        type="tel"
        inputmode="tel"
        autocomplete="off"
        :hint="t('customers.phoneHint')"
      />
      <AppAlert v-if="formError" kind="error">{{ formError }}</AppAlert>
      <div class="flex gap-2">
        <AppButton type="submit" :loading="saving" class="flex-1">{{ t('customers.save') }}</AppButton>
        <AppButton type="button" variant="ghost" @click="closeForm">{{ t('app.cancel') }}</AppButton>
      </div>
    </form>

    <p v-if="!error && catalog.contacts.length === 0" class="text-slate-600">{{ t('customers.empty') }}</p>
    <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="contact in catalog.contacts" :key="contact.id" class="flex items-stretch">
        <RouterLink
          :to="
            payMode
              ? { name: 'record-payment', params: { contactId: contact.id } }
              : { name: 'customer-detail', params: { contactId: contact.id } }
          "
          class="flex-1 min-w-0 px-4 py-3 flex items-center justify-between gap-3 min-h-14"
        >
          <span class="min-w-0">
            <span class="block font-medium text-slate-900 truncate">{{ contact.name }}</span>
            <span v-if="contact.phone" class="block text-sm text-slate-600">{{ contact.phone }}</span>
          </span>
          <span
            class="whitespace-nowrap tabular-nums"
            :class="(owed[contact.id] ?? 0) > 0 ? 'font-semibold text-slate-900' : 'text-slate-600'"
            >{{
              (owed[contact.id] ?? 0) > 0
                ? formatMoney(BigInt(owed[contact.id] ?? 0), currency, locale)
                : t('customers.noDebt')
            }}</span
          >
        </RouterLink>
        <button
          v-if="canWrite"
          type="button"
          class="px-4 min-w-14 text-brand-800 font-medium border-l border-slate-200 hover:bg-slate-50"
          :aria-label="t('customers.editOne', { name: contact.name })"
          @click="openForm(contact)"
        >
          {{ t('customers.edit') }}
        </button>
      </li>
    </ul>
  </section>
</template>
