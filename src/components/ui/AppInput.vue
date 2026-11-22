<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    label: string
    type?: string
    placeholder?: string
    hint?: string
    error?: string | null
    required?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'search'
    disabled?: boolean
    /** The browser stops typing here. The database has its own limits; this one is a courtesy. */
    maxlength?: number
  }>(),
  { type: 'text', placeholder: '', hint: '', error: null, required: false, autocomplete: undefined, inputmode: undefined, disabled: false, maxlength: 240 },
)

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="space-y-1">
    <label
      :for="id"
      class="block text-sm font-medium text-slate-700"
      :class="required ? `after:content-['*'] after:ml-0.5 after:text-red-600` : ''"
      >{{ label }}</label
    >
    <input
      :id="id"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="block w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
      :class="error ? 'border-red-500' : ''"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-red-700" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
