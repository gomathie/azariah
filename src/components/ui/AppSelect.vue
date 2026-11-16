<script setup lang="ts">
import { useId } from 'vue'

export interface SelectOption {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    label: string
    options: SelectOption[]
    hint?: string
    error?: string | null
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  { hint: '', error: null, required: false, disabled: false, placeholder: '' },
)

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="space-y-1">
    <label :for="id" class="block text-sm font-medium text-slate-700">
      {{ label }}<span v-if="required" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <select
      :id="id"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="block w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
      :class="error ? 'border-red-500' : ''"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-red-700" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
