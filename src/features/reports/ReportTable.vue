<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string }[]
  rows: Record<string, unknown>[]
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" class="text-left px-3 py-2 border-b border-slate-200">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="column in columns" :key="column.key" class="px-3 py-2 border-b border-slate-100">
            {{ row[column.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
