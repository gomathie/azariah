<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { addShopPerson, listShopPeople, type ShopPerson } from '@/features/settings/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()
const people = ref<ShopPerson[]>([])
const name = ref('')
const deviceName = ref('')
const role = ref<'staff' | 'manager'>('staff')
const error = ref<string | null>(null)
const notice = ref('')
const loading = ref(false)
const canAdd = computed(() => business.current?.role === 'owner' || business.current?.role === 'manager')
const isOwner = computed(() => business.current?.role === 'owner')
const firstVisit = computed(() => route.query.first === '1')

async function load() {
  const id = business.current?.id
  if (!id) return
  people.value = await listShopPeople(id)
}

watch(() => business.current?.id, () => void load(), { immediate: true })

async function addPerson() {
  const id = business.current?.id
  if (!id || name.value.trim().length === 0 || deviceName.value.trim().length === 0) {
    error.value = t('errors.required')
    return
  }
  loading.value = true
  error.value = null
  try {
    const chosen = isOwner.value && role.value === 'manager' ? 'manager' : 'staff'
    await addShopPerson(id, name.value.trim(), deviceName.value.trim(), chosen)
    name.value = ''
    deviceName.value = ''
    role.value = 'staff'
    notice.value = t('members.added')
    await load()
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}

function finish() {
  void router.push({ name: 'home' })
}
</script>

<template>
  <PageHeader :title="t('members.title')" :back="!firstVisit" />
  <section class="p-4 space-y-4 max-w-lg">
    <p class="text-slate-700">{{ t('members.intro') }}</p>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>

    <form v-if="canAdd" class="space-y-3" @submit.prevent="addPerson">
      <AppInput v-model="name" :label="t('members.name')" :placeholder="t('members.namePlaceholder')" />
      <AppInput v-model="deviceName" :label="t('members.device')" :placeholder="t('members.devicePlaceholder')" />
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium text-slate-700">{{ t('members.roleQuestion') }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="min-h-14 rounded-xl border font-semibold"
            :class="role === 'staff' ? 'bg-brand-700 text-white border-brand-700' : 'bg-white border-slate-200'"
            @click="role = 'staff'"
          >
            {{ t('members.staff') }}
          </button>
          <button
            v-if="isOwner"
            type="button"
            class="min-h-14 rounded-xl border font-semibold"
            :class="role === 'manager' ? 'bg-brand-700 text-white border-brand-700' : 'bg-white border-slate-200'"
            @click="role = 'manager'"
          >
            {{ t('members.admin') }}
          </button>
        </div>
      </fieldset>
      <AppButton type="submit" block :loading="loading">{{ t('members.add') }}</AppButton>
    </form>

    <p v-if="people.length === 0" class="text-slate-600">{{ t('members.empty') }}</p>
    <ul v-else class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="person in people" :key="person.id" class="px-4 py-3 min-h-14">
        <span class="block font-medium text-slate-900">{{ person.name }}</span>
        <span class="block text-sm text-slate-600">{{ person.device_name }} · {{ person.role === 'manager' ? t('members.admin') : t('members.staff') }}</span>
      </li>
    </ul>

    <AppButton v-if="firstVisit" type="button" variant="secondary" block @click="finish">{{ t('members.done') }}</AppButton>
  </section>
</template>
