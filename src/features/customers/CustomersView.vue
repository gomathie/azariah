<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { getSupabase } from '@/lib/supabase/client'
import { useBusinessStore } from '@/stores/business'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

const { t, locale } = useI18n()
const business = useBusinessStore()
const catalog = useCatalogStore()
const owed = ref<Record<string, number>>({})
const error = ref<string | null>(null)
const adding = ref(false)
const saving = ref(false)
const name = ref('')
const phone = ref('')
const formError = ref<string | null>(null)
const saved = ref<string | null>(null)
// Viewers can read the customer book but the database refuses their writes, so the button is not offered.
const canAdd = computed(() => business.current?.role !== 'viewer')

async function addCustomer() {
  formError.value = null
  saved.value = null
  const cleanName = name.value.trim()
  if (!cleanName) {
    formError.value = t('errors.required')
    return
  }
  if (catalog.contacts.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
    formError.value = t('customers.duplicate')
    return
  }
  saving.value = true
  try {
    await catalog.addContact(cleanName, phone.value.trim() || null)
    saved.value = t('customers.savedOne', { name: cleanName })
    name.value = ''
    phone.value = ''
    adding.value = false
  } catch {
    formError.value = navigator.onLine ? t('errors.generic') : t('errors.network')
  } finally {
    saving.value = false
  }
}

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
    <AppAlert v-if="saved" kind="success">{{ saved }}</AppAlert>
    <AppButton v-if="canAdd && !adding" type="button" block @click="((adding = true), (saved = null))">
      {{ t('customers.add') }}
    </AppButton>
    <form
      v-if="adding"
      class="space-y-3 bg-white rounded-xl border border-slate-200 p-4"
      novalidate
      @submit.prevent="addCustomer"
    >
      <h2 class="font-semibold text-slate-900">{{ t('customers.add') }}</h2>
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
        <AppButton type="button" variant="ghost" @click="((adding = false), (formError = null))">
          {{ t('app.cancel') }}
        </AppButton>
      </div>
    </form>
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
