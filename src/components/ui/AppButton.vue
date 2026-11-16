<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    block?: boolean
    size?: 'md' | 'lg'
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false, block: false, size: 'md' },
)

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-12 px-4'
  const size = props.size === 'lg' ? 'text-lg min-h-14 px-6' : 'text-base'
  const variant = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
    secondary: 'bg-white text-brand-800 border border-brand-200 hover:bg-brand-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[props.variant]
  return [base, size, variant, props.block ? 'w-full' : ''].join(' ')
})
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span
      v-if="loading"
      class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
