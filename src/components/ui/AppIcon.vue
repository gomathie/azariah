<script setup lang="ts">
/**
 * Line icons drawn for Azaria, inline so they cost no extra request and work offline.
 * Icons are decoration: the text next to them carries the meaning, so they are hidden from screen readers.
 */
export type IconName =
  | 'home'
  | 'book'
  | 'plus'
  | 'people'
  | 'report'
  | 'settings'
  | 'sale'
  | 'expense'
  | 'stock'
  | 'payment'
  | 'transfer'
  | 'owner'
  | 'undo'
  | 'flag'
  | 'paper'

defineProps<{ name: IconName }>()

const PATHS: Record<IconName, string[]> = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10v9.5h13V10', 'M10 19.5v-5h4v5'],
  book: ['M5 4.5h12a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z', 'M5 17.5a2 2 0 0 1 2-2h12', 'M9 8.5h6', 'M9 11.5h4'],
  plus: ['M12 5v14', 'M5 12h14'],
  people: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5', 'M16 4.3a3.5 3.5 0 0 1 0 6.4', 'M18 14.8c2 .7 3.5 2.4 3.5 5.2'],
  report: ['M4.5 20V4', 'M4.5 20h15', 'M8.5 16v-4', 'M12.5 16V8', 'M16.5 16v-6'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8'],
  sale: ['M4 12.5 11.5 5H19v7.5L11.5 20z', 'M15 9h.01'],
  expense: ['M5 6.5h14v11H5z', 'M5 10h14', 'M8 14h3'],
  stock: ['M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z', 'M4 8.5l8 4.5 8-4.5', 'M12 13v7'],
  payment: ['M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14'],
  transfer: ['M4 8.5h14', 'M14.5 5 18 8.5 14.5 12', 'M20 15.5H6', 'M9.5 12 6 15.5 9.5 19'],
  owner: ['M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M5 20c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5'],
  undo: ['M8 5 4 9l4 4', 'M4 9h10a5 5 0 0 1 0 10h-3'],
  flag: ['M6 21V4', 'M6 5h11l-2 4 2 4H6'],
  paper: ['M7 3.5h7l4 4v13H7z', 'M14 3.5v4h4', 'M10 12h5', 'M10 15.5h5'],
}
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in PATHS[name]" :key="d" :d="d" />
  </svg>
</template>
