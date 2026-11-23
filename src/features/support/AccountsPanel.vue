<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { listAccounts, type Account } from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'
import { dateLocale } from '@/utils/dates'

/** Every account that was created, newest first, also people who have not made a shop yet. */
const { t, locale } = useI18n()
const PAGE = 25
const search = ref('')
const accounts = ref<Account[]>([])
const hasMore = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')
const time = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
    : t('support.accountNever')

async function load(reset: boolean) {
  loading.value = true
  error.value = null
  try {
    const before = reset ? null : (accounts.value.at(-1)?.created_at ?? null)
    const rows = await listAccounts(search.value.trim() || null, before)
    accounts.value = reset ? rows : [...accounts.value, ...rows]
    hasMore.value = rows.length === PAGE
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => void load(true))
</script>

<template>
  <section class="space-y-4" aria-labelledby="accounts-title">
    <h2 id="accounts-title" class="sr-only">{{ t('support.accounts') }}</h2>
    <form class="flex gap-2 items-end" role="search" @submit.prevent="load(true)">
      <div class="flex-1">
        <AppInput v-model="search" :label="t('support.accountSearch')" inputmode="search" autocomplete="off" />
      </div>
      <AppButton type="submit" :loading="loading">{{ t('support.searchAction') }}</AppButton>
    </form>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!loading && !error && accounts.length === 0" class="text-slate-600">{{ t('support.accountNone') }}</p>

    <ul class="space-y-3">
      <li v-for="account in accounts" :key="account.id" class="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p class="font-semibold text-slate-900 break-all">
          {{ account.email ?? '—' }}
          <span v-if="account.is_admin" class="font-medium text-brand-800"> · {{ t('support.accountTeam') }}</span>
        </p>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt class="text-slate-600">{{ t('support.accountCreated') }}</dt>
          <dd class="text-slate-900">{{ time(account.created_at) }}</dd>
          <dt class="text-slate-600">{{ t('support.accountLastSeen') }}</dt>
          <dd class="text-slate-900">{{ time(account.last_sign_in_at) }}</dd>
        </dl>
        <p v-if="!account.confirmed" class="text-sm font-medium text-amber-800">{{ t('support.accountUnconfirmed') }}</p>
        <p v-if="account.shops.length === 0" class="text-sm text-slate-600">{{ t('support.accountNoShop') }}</p>
        <ul v-else class="text-sm text-slate-900 space-y-1">
          <li v-for="shop in account.shops" :key="shop.id" class="break-words">
            {{ shop.name }} · {{ t(`support.roles.${shop.role}`) }}
            <span v-if="shop.status !== 'active'" class="font-medium text-red-800">
              · {{ t('support.statusSuspended') }}</span
            >
          </li>
        </ul>
      </li>
    </ul>
    <AppButton v-if="hasMore" type="button" variant="secondary" block :loading="loading" @click="load(false)">
      {{ t('support.accountMore') }}
    </AppButton>
  </section>
</template>
