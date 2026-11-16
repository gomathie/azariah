<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { changeMembership, inviteMember, listMembers, type MembershipRow } from '@/features/settings/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'

const { t } = useI18n()
const business = useBusinessStore()
const auth = useAuthStore()
const rows = ref<MembershipRow[]>([])
const email = ref('')
const role = ref('staff')
const error = ref<string | null>(null)
const notice = ref('')
const loading = ref(false)
const roleOptions = [
  { value: 'manager', label: t('members.manager') },
  { value: 'staff', label: t('members.staff') },
  { value: 'viewer', label: t('members.viewer') },
]
if (business.current?.role === 'owner') roleOptions.unshift({ value: 'owner', label: t('members.owner') })

async function load() {
  const id = business.current?.id
  if (!id) return
  rows.value = await listMembers(id)
}

watch(() => business.current?.id, () => void load(), { immediate: true })

async function invite() {
  const id = business.current?.id
  if (!id || !email.value.includes('@')) {
    error.value = t('errors.AZ_INVALID_INPUT')
    return
  }
  loading.value = true
  error.value = null
  try {
    await inviteMember(id, email.value.trim(), role.value)
    email.value = ''
    notice.value = t('members.invited')
    await load()
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  } finally {
    loading.value = false
  }
}

async function remove(membershipId: string) {
  const id = business.current?.id
  if (!id) return
  error.value = null
  try {
    await changeMembership(id, membershipId, null, 'removed')
    await load()
  } catch (e) {
    error.value = e instanceof RpcError ? t(e.i18nKey) : t('errors.generic')
  }
}
</script>

<template>
  <PageHeader :title="t('members.title')" back />
  <section class="p-4 space-y-4 max-w-lg">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
    <form v-if="business.current?.role === 'owner' || business.current?.role === 'manager'" class="space-y-3" @submit.prevent="invite">
      <AppInput v-model="email" type="email" :label="t('members.email')" />
      <AppSelect v-model="role" :label="t('members.role')" :options="roleOptions" />
      <AppButton type="submit" :loading="loading">{{ t('members.invite') }}</AppButton>
    </form>
    <p v-if="rows.length === 0" class="text-slate-600">{{ t('members.empty') }}</p>
    <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
      <li v-for="row in rows" :key="row.id" class="px-4 py-3 flex items-center justify-between gap-3 min-h-14">
        <span>
          <span class="block font-medium">{{ row.invited_email || row.user_id }}</span>
          <span class="block text-sm text-slate-500">{{ row.role }} · {{ row.status }}</span>
        </span>
        <AppButton
          v-if="row.status === 'active' && row.user_id !== auth.user?.id"
          type="button"
          variant="ghost"
          @click="remove(row.id)"
          >{{ t('members.remove') }}</AppButton
        >
      </li>
    </ul>
  </section>
</template>
