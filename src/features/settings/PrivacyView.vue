<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  getSupportAccess,
  grantSupportAccess,
  revokeSupportAccess,
  type SupportAccess,
} from '@/features/settings/api'
import { RpcError } from '@/lib/supabase/rpc'
import { useBusinessStore } from '@/stores/business'
import { dateLocale } from '@/utils/dates'

const { t, locale } = useI18n()
const business = useBusinessStore()
const access = ref<SupportAccess | null>(null)
const hours = ref('24')
const reason = ref('')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref(false)

const role = computed(() => business.current?.role)
const isOwner = computed(() => role.value === 'owner' && !business.supportBusiness)
// Owners and managers may see the record of what support did. Staff and viewers may not.
const canSee = computed(() => (role.value === 'owner' || role.value === 'manager') && !business.supportBusiness)
const hourOptions = computed(() => [
  { value: '24', label: t('support.hours24') },
  { value: '72', label: t('support.hours72') },
  { value: '168', label: t('support.hours168') },
])

const time = (iso: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')
const eventLabel = (action: string) => {
  const key = `support.events.${action.replace('support.', '')}`
  const label = t(key)
  return label === key ? action : label
}

async function refresh() {
  const id = business.current?.id
  if (!id || !canSee.value) return
  try {
    access.value = await getSupportAccess(id)
  } catch (e) {
    // A database that does not have support access yet is not an error the owner can act on.
    access.value = null
    if (e instanceof RpcError && e.code !== 'generic') error.value = message(e)
  }
}

async function allow() {
  const id = business.current?.id
  if (!id) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await grantSupportAccess(id, Number(hours.value), reason.value.trim() || null)
    reason.value = ''
    notice.value = t('support.allowed')
    await refresh()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}

async function stop() {
  const id = business.current?.id
  if (!id) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await revokeSupportAccess(id)
    notice.value = t('support.stopped')
    await refresh()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}

watch(() => business.current?.id, () => void refresh(), { immediate: true })
</script>

<template>
  <PageHeader :title="t('privacy.title')" back />
  <section class="p-4 max-w-lg space-y-6">
    <p class="text-slate-700 leading-relaxed">{{ t('privacy.body') }}</p>

    <div v-if="canSee" class="space-y-3">
      <h2 class="text-base font-semibold text-slate-900">{{ t('support.ownerTitle') }}</h2>
      <p class="text-slate-700 leading-relaxed">{{ t('support.ownerIntro') }}</p>
      <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>

      <template v-if="access?.active">
        <AppAlert kind="warning">{{ t('support.activeUntil', { time: time(access.active.expires_at) }) }}</AppAlert>
        <AppButton v-if="isOwner" type="button" variant="danger" block :loading="busy" @click="stop">
          {{ t('support.stop') }}
        </AppButton>
      </template>
      <form v-else-if="isOwner" class="space-y-3" novalidate @submit.prevent="allow">
        <AppSelect v-model="hours" :label="t('support.howLong')" :options="hourOptions" />
        <AppInput v-model="reason" :label="t('support.why')" />
        <AppButton type="submit" variant="secondary" block :loading="busy">{{ t('support.allow') }}</AppButton>
      </form>
      <p v-if="!isOwner" class="text-sm text-slate-600">{{ t('support.ownerOnly') }}</p>

      <template v-if="access && access.history.length">
        <h3 class="text-sm font-semibold text-slate-600">{{ t('support.historyTitle') }}</h3>
        <ul class="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 text-sm">
          <li v-for="(event, index) in access.history" :key="index" class="px-4 py-2 flex justify-between gap-3">
            <span class="text-slate-900">{{ eventLabel(event.action) }}</span>
            <span class="text-slate-600 whitespace-nowrap">{{ time(event.at) }}</span>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>
