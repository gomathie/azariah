<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ kind?: 'info' | 'success' | 'warning' | 'error' }>(), {
  kind: 'info',
})

const classes = computed(
  () =>
    ({
      info: 'bg-sky-50 text-sky-900 border-sky-200',
      success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      warning: 'bg-amber-50 text-amber-900 border-amber-200',
      error: 'bg-red-50 text-red-900 border-red-200',
    })[props.kind],
)
</script>

<template>
  <div :role="kind === 'error' ? 'alert' : 'status'" class="rounded-xl border px-4 py-3 text-sm" :class="classes">
    <slot />
  </div>
</template>
