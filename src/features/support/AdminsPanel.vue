<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import {
  ADMIN_RIGHTS,
  listAdmins,
  removeAdmin,
  saveAdmin,
  type AdminRight,
  type TeamAdmin,
} from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'

/**
 * The support team: who is on it and what each person may do.
 * Only a superadmin reaches this; the database checks again on every call.
 */
const { t } = useI18n()

interface Draft {
  isSuper: boolean
  rights: AdminRight[]
}

const admins = ref<TeamAdmin[]>([])
const drafts = ref<Record<string, Draft>>({})
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref<string | null>(null)
const removing = ref<string | null>(null)

const email = ref('')
const fresh = ref<Draft>({ isSuper: false, rights: ['view_shops'] })
const formError = ref<string | null>(null)

const message = (e: unknown) =>
  e instanceof RpcError
    ? e.code === 'AZ_NOT_FOUND'
      ? t('support.adminNotFound')
      : t(e.i18nKey)
    : navigator.onLine
      ? t('errors.generic')
      : t('errors.network')

async function load() {
  error.value = null
  try {
    admins.value = await listAdmins()
    drafts.value = Object.fromEntries(
      admins.value.map((a) => [a.user_id, { isSuper: a.is_super, rights: [...a.rights] }]),
    )
  } catch (e) {
    error.value = message(e)
  }
}

async function add() {
  formError.value = null
  notice.value = null
  const clean = email.value.trim()
  if (!/^\S+@\S+$/.test(clean)) {
    formError.value = t('support.adminEmailInvalid')
    return
  }
  busy.value = 'new'
  try {
    await saveAdmin(clean, fresh.value.rights, fresh.value.isSuper)
    notice.value = t('support.adminSaved')
    email.value = ''
    fresh.value = { isSuper: false, rights: ['view_shops'] }
    await load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = null
  }
}

async function save(admin: TeamAdmin) {
  const draft = drafts.value[admin.user_id]
  if (!draft || !admin.email) return
  busy.value = admin.user_id
  error.value = null
  notice.value = null
  try {
    await saveAdmin(admin.email, draft.rights, draft.isSuper)
    notice.value = t('support.adminSaved')
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

async function remove(admin: TeamAdmin) {
  busy.value = admin.user_id
  error.value = null
  notice.value = null
  try {
    await removeAdmin(admin.user_id)
    removing.value = null
    notice.value = t('support.adminRemoved')
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

onMounted(() => void load())
</script>

<template>
  <section class="space-y-4" aria-labelledby="admins-title">
    <h2 id="admins-title" class="sr-only">{{ t('support.admins') }}</h2>
    <p class="text-slate-700">{{ t('support.adminsIntro') }}</p>

    <form class="rounded-xl border border-slate-200 bg-white p-4 space-y-3" novalidate @submit.prevent="add">
      <AppInput
        v-model="email"
        :label="t('support.adminEmail')"
        :hint="t('support.adminEmailHint')"
        type="email"
        autocomplete="off"
        required
        :maxlength="320"
      />
      <fieldset class="space-y-1">
        <legend class="text-sm font-medium text-slate-700 mb-1">{{ t('support.adminCan') }}</legend>
        <label class="flex items-center gap-3 min-h-11">
          <input v-model="fresh.isSuper" type="checkbox" class="size-5 accent-brand-700" />
          <span class="text-slate-900">{{ t('support.adminSuper') }}</span>
        </label>
        <template v-if="!fresh.isSuper">
          <label v-for="right in ADMIN_RIGHTS" :key="right" class="flex items-center gap-3 min-h-11">
            <input v-model="fresh.rights" type="checkbox" :value="right" class="size-5 accent-brand-700" />
            <span class="text-slate-900">{{ t(`support.rights.${right}`) }}</span>
          </label>
        </template>
      </fieldset>
      <AppAlert v-if="formError" kind="error">{{ formError }}</AppAlert>
      <AppButton type="submit" :loading="busy === 'new'">{{ t('support.adminAdd') }}</AppButton>
    </form>

    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppAlert v-if="notice" kind="success">{{ notice }}</AppAlert>

    <ul class="space-y-3">
      <li v-for="admin in admins" :key="admin.user_id" class="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p class="font-semibold text-slate-900 break-all">
          {{ admin.email ?? '—' }}
          <span v-if="admin.is_me" class="font-medium text-slate-600"> · {{ t('support.adminYou') }}</span>
        </p>
        <p v-if="admin.is_me" class="text-sm text-slate-600">{{ t('support.adminSelf') }}</p>
        <fieldset v-else-if="drafts[admin.user_id]" class="space-y-1">
          <legend class="sr-only">{{ t('support.adminCan') }}</legend>
          <label class="flex items-center gap-3 min-h-11">
            <input v-model="drafts[admin.user_id]!.isSuper" type="checkbox" class="size-5 accent-brand-700" />
            <span class="text-slate-900">{{ t('support.adminSuper') }}</span>
          </label>
          <template v-if="!drafts[admin.user_id]!.isSuper">
            <label v-for="right in ADMIN_RIGHTS" :key="right" class="flex items-center gap-3 min-h-11">
              <input
                v-model="drafts[admin.user_id]!.rights"
                type="checkbox"
                :value="right"
                class="size-5 accent-brand-700"
              />
              <span class="text-slate-900">{{ t(`support.rights.${right}`) }}</span>
            </label>
          </template>
        </fieldset>
        <div v-if="!admin.is_me" class="flex flex-wrap gap-2">
          <template v-if="removing === admin.user_id">
            <AppButton type="button" variant="danger" :loading="busy === admin.user_id" @click="remove(admin)">
              {{ t('support.adminRemoveYes') }}
            </AppButton>
            <AppButton type="button" variant="ghost" @click="removing = null">{{ t('app.cancel') }}</AppButton>
          </template>
          <template v-else>
            <AppButton type="button" :loading="busy === admin.user_id" @click="save(admin)">
              {{ t('support.adminSave') }}
            </AppButton>
            <AppButton type="button" variant="secondary" @click="removing = admin.user_id">
              {{ t('support.adminRemove') }}
            </AppButton>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>
