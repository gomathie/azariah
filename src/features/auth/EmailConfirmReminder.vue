<script setup lang="ts">
/**
 * A reminder to confirm the email, shown after sign-in. People get into the app first;
 * this can always be closed with "Later" and never blocks the books.
 */
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useAuthStore } from '@/stores/auth'
import { cleanCode, confirmEmailCode, emailCodeErrorKey, fetchEmailConfirmation, isSnoozed, sendEmailCode, snooze } from './emailConfirm'

const { t } = useI18n()
const auth = useAuthStore()

const open = ref(false)
const step = ref<'ask' | 'code' | 'done'>('ask')
const email = ref('')
const code = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const panel = ref<HTMLElement | null>(null)

async function check() {
  const userId = auth.user?.id
  if (!userId || open.value || isSnoozed(userId)) return
  try {
    const status = await fetchEmailConfirmation()
    if (status.confirmed || !status.email) return
    email.value = status.email
    step.value = 'ask'
    open.value = true
    await nextTick()
    panel.value?.focus()
  } catch {
    /* Offline, or the database is older than the app: say nothing and try on the next visit. */
  }
}

onMounted(check)
watch(() => auth.user?.id, check)

function later() {
  if (auth.user) snooze(auth.user.id)
  open.value = false
}

async function send() {
  error.value = null
  busy.value = true
  try {
    await sendEmailCode(email.value)
    code.value = ''
    step.value = 'code'
  } catch (e) {
    error.value = t(emailCodeErrorKey(e))
  } finally {
    busy.value = false
  }
}

async function confirm() {
  error.value = null
  const digits = cleanCode(code.value)
  if (digits.length < 6) {
    error.value = t('emailConfirm.wrongCode')
    return
  }
  busy.value = true
  try {
    if (await confirmEmailCode(email.value, digits)) step.value = 'done'
    else error.value = t('errors.generic')
  } catch (e) {
    error.value = t(emailCodeErrorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    class="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
    @keydown.esc="step === 'done' ? (open = false) : later()"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-confirm-title"
      tabindex="-1"
      class="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-xl outline-none"
    >
      <h2 id="email-confirm-title" class="text-lg font-semibold text-slate-900">{{ t('emailConfirm.title') }}</h2>

      <template v-if="step === 'ask'">
        <p class="text-slate-700">{{ t('emailConfirm.why') }}</p>
        <p class="text-slate-700">
          {{ t('emailConfirm.sendTo') }} <strong class="break-all">{{ email }}</strong>
        </p>
        <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
        <AppButton block :loading="busy" @click="send">{{ t('emailConfirm.send') }}</AppButton>
        <button type="button" class="block w-full min-h-12 text-brand-700 underline" @click="later">
          {{ t('emailConfirm.later') }}
        </button>
      </template>

      <form v-else-if="step === 'code'" class="space-y-4" novalidate @submit.prevent="confirm">
        <p class="text-slate-700">
          {{ t('emailConfirm.sent') }} <strong class="break-all">{{ email }}</strong
          >. {{ t('emailConfirm.typeCode') }}
        </p>
        <AppInput
          v-model="code"
          :label="t('emailConfirm.code')"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="12"
          required
        />
        <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
        <AppButton type="submit" block :loading="busy">{{ t('emailConfirm.confirm') }}</AppButton>
        <div class="flex justify-between gap-3">
          <button type="button" class="min-h-12 text-brand-700 underline" :disabled="busy" @click="send">
            {{ t('emailConfirm.again') }}
          </button>
          <button type="button" class="min-h-12 text-brand-700 underline" @click="later">
            {{ t('emailConfirm.later') }}
          </button>
        </div>
      </form>

      <template v-else>
        <AppAlert kind="success">{{ t('emailConfirm.done') }}</AppAlert>
        <AppButton block @click="open = false">{{ t('emailConfirm.close') }}</AppButton>
      </template>
    </div>
  </div>
</template>
