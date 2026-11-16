<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseMoney } from '@/utils/money'

const props = withDefaults(
  defineProps<{
    label: string
    currency: string
    minorUnit: number
    hint?: string
  }>(),
  { hint: '' },
)

const model = defineModel<bigint | null>({ default: null })
const { t } = useI18n()
const id = useId()
const text = ref('')
const invalid = ref(false)

function onInput(event: Event) {
  text.value = (event.target as HTMLInputElement).value
  if (text.value.trim() === '') {
    invalid.value = false
    model.value = null
    return
  }
  const parsed = parseMoney(text.value, props.minorUnit)
  invalid.value = parsed === null
  model.value = parsed
}
</script>

<template>
  <div class="space-y-1">
    <label :for="id" class="block text-sm font-medium text-slate-700">{{ label }}</label>
    <input
      :id="id"
      :value="text"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="block w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
      :class="invalid ? 'border-red-500' : ''"
      @input="onInput"
    />
    <p v-if="invalid" :id="`${id}-error`" class="text-sm text-red-700" role="alert">{{ t('errors.invalid_amount') }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-slate-500">{{ hint }}</p>
    <span class="sr-only">{{ currency }}</span>
  </div>
</template>
