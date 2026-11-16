<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useCatalogStore } from '@/stores/catalog'

const contactId = defineModel<string | null>({ default: null })
const { t } = useI18n()
const catalog = useCatalogStore()
const name = ref('')
const phone = ref('')
const error = ref<string | null>(null)
const saving = ref(false)

async function addCustomer() {
  error.value = null
  if (!name.value.trim()) {
    error.value = t('errors.required')
    return
  }
  saving.value = true
  try {
    const created = await catalog.addContact(name.value.trim(), phone.value.trim() || null)
    contactId.value = created.id
    name.value = ''
    phone.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.generic')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <AppSelect
      :model-value="contactId ?? ''"
      :label="t('sale.customer')"
      :options="catalog.contacts.map((c) => ({ value: c.id, label: c.name }))"
      :placeholder="t('sale.customer')"
      @update:model-value="contactId = $event || null"
    />
    <AppInput v-model="name" :label="t('customers.name')" autocomplete="name" />
    <AppInput v-model="phone" :label="t('customers.phone')" type="tel" autocomplete="tel" />
    <p v-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
    <AppButton type="button" variant="secondary" :loading="saving" @click="addCustomer">{{ t('customers.add') }}</AppButton>
  </div>
</template>
