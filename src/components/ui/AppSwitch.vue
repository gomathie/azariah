<script setup lang="ts">
/**
 * An on/off switch. The parent decides what a tap does (it may ask first), so the switch
 * only reports the tap and shows the value it is given.
 */
defineProps<{
  modelValue: boolean
  label: string
  /** Words for the current state, shown beside the switch ("On", "Off"). */
  stateText?: string
  disabled?: boolean
}>()
defineEmits<{ toggle: [next: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    class="inline-flex items-center gap-3 min-h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
    @click="$emit('toggle', !modelValue)"
  >
    <span
      class="relative inline-block h-8 w-14 shrink-0 rounded-full transition-colors"
      :class="modelValue ? 'bg-emerald-600' : 'bg-slate-400'"
      aria-hidden="true"
    >
      <span
        class="absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform"
        :class="modelValue ? 'translate-x-6' : ''"
      />
    </span>
    <span v-if="stateText" class="font-semibold whitespace-nowrap" :class="modelValue ? 'text-emerald-800' : 'text-slate-700'">
      {{ stateText }}
    </span>
  </button>
</template>
