<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  createDiscountCode,
  listDiscountCodes,
  setDiscountCodeActive,
  type DiscountCode,
} from '@/features/support/api'
import { RpcError } from '@/lib/supabase/rpc'
import { dateLocale } from '@/utils/dates'

/** Discount codes for Azaria Plus. Only a platform admin reaches this; the database checks again. */
const { t, locale } = useI18n()
const codes = ref<DiscountCode[]>([])
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const created = ref<string | null>(null)
const saving = ref(false)
const busy = ref<string | null>(null)

const code = ref('')
const percent = ref('')
/** Days the code works for; an empty value means for ever. */
const period = ref('')
const maxUses = ref('')
const note = ref('')

const periods = () => [
  { value: '', label: t('support.periodForever') },
  { value: '30', label: t('support.period30') },
  { value: '90', label: t('support.period90') },
  { value: '365', label: t('support.period365') },
]

const message = (e: unknown) =>
  e instanceof RpcError ? t(e.i18nKey) : navigator.onLine ? t('errors.generic') : t('errors.network')
const day = (iso: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), { dateStyle: 'medium' }).format(new Date(iso))

async function load() {
  error.value = null
  try {
    codes.value = await listDiscountCodes()
  } catch (e) {
    error.value = message(e)
  }
}

/** A whole number within the limits, or null when the text is not one. */
function wholeNumber(text: string, min: number, max: number): number | null {
  if (!/^\d{1,7}$/.test(text.trim())) return null
  const value = Number(text.trim())
  return value >= min && value <= max ? value : null
}

async function create() {
  formError.value = null
  created.value = null
  const cleanCode = code.value.trim().toUpperCase()
  const percentOff = wholeNumber(percent.value, 1, 100)
  const uses = maxUses.value.trim() === '' ? null : wholeNumber(maxUses.value, 1, 1_000_000)
  if (!/^[A-Z0-9]{6,24}$/.test(cleanCode) || percentOff === null || (maxUses.value.trim() !== '' && uses === null)) {
    formError.value = t('support.discountInvalid')
    return
  }
  saving.value = true
  try {
    await createDiscountCode({
      code: cleanCode,
      percentOff,
      validDays: period.value ? Number(period.value) : null,
      maxUses: uses,
      note: note.value.trim() || null,
    })
    created.value = cleanCode
    code.value = ''
    percent.value = ''
    maxUses.value = ''
    note.value = ''
    await load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    saving.value = false
  }
}

async function toggle(row: DiscountCode) {
  busy.value = row.id
  error.value = null
  try {
    await setDiscountCodeActive(row.id, !row.active)
    row.active = !row.active
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = null
  }
}

function validity(row: DiscountCode): string {
  if (!row.valid_until) return t('support.discountForever')
  const date = day(row.valid_until)
  return new Date(row.valid_until) > new Date() ? t('support.discountUntil', { date }) : t('support.discountEnded', { date })
}

onMounted(() => void load())
</script>

<template>
  <section class="space-y-4" aria-labelledby="discount-codes-title">
    <h2 id="discount-codes-title" class="sr-only">{{ t('support.discounts') }}</h2>
    <p class="text-slate-700">{{ t('support.discountsIntro') }}</p>

    <form class="rounded-xl border border-slate-200 bg-white p-4 space-y-3" novalidate @submit.prevent="create">
      <AppInput v-model="code" :label="t('support.discountCode')" required autocomplete="off" :maxlength="24" />
      <AppInput v-model="percent" :label="t('support.discountPercent')" required inputmode="numeric" :maxlength="3" />
      <AppSelect v-model="period" :label="t('support.discountPeriod')" :options="periods()" />
      <AppInput
        v-model="maxUses"
        :label="t('support.discountMaxUses')"
        :hint="t('support.discountMaxUsesHint')"
        inputmode="numeric"
        :maxlength="7"
      />
      <AppInput v-model="note" :label="t('support.discountNote')" :maxlength="200" />
      <AppAlert v-if="formError" kind="error">{{ formError }}</AppAlert>
      <AppAlert v-if="created" kind="success">{{ t('support.discountCreated', { code: created }) }}</AppAlert>
      <AppButton type="submit" :loading="saving">{{ t('support.discountCreate') }}</AppButton>
    </form>

    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <p v-if="!error && codes.length === 0" class="text-slate-600">{{ t('support.discountNone') }}</p>
    <ul class="space-y-3">
      <li v-for="row in codes" :key="row.id" class="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono font-semibold text-slate-900 break-all">{{ row.code }}</p>
            <p class="text-sm text-slate-600">{{ validity(row) }}</p>
          </div>
          <span class="shrink-0 text-lg font-semibold text-brand-800">{{ row.percent_off }}%</span>
        </div>
        <p class="text-sm text-slate-700">
          {{
            row.max_uses
              ? t('support.discountUsesOf', { n: row.uses, max: row.max_uses })
              : t('support.discountUses', { n: row.uses })
          }}
          <span v-if="!row.active" class="font-medium text-red-800"> · {{ t('support.discountOff') }}</span>
        </p>
        <p v-if="row.note" class="text-sm text-slate-600 break-words">{{ row.note }}</p>
        <AppButton type="button" variant="secondary" :loading="busy === row.id" @click="toggle(row)">
          {{ row.active ? t('support.discountSwitchOff') : t('support.discountSwitchOn') }}
        </AppButton>
      </li>
    </ul>
  </section>
</template>
