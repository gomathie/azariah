<script setup lang="ts">
import type { ReportTableData } from '@/features/reports/build'

defineProps<{ table: ReportTableData; emptyText: string }>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th
            v-for="column in table.columns"
            :key="column.key"
            scope="col"
            class="px-3 py-2 border-b border-slate-200 text-slate-600 font-medium whitespace-nowrap"
            :class="column.numeric ? 'text-right' : 'text-left'"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="table.rows.length === 0">
          <td :colspan="table.columns.length" class="px-3 py-3 text-slate-600">{{ emptyText }}</td>
        </tr>
        <tr v-for="(row, index) in table.rows" :key="index">
          <td
            v-for="column in table.columns"
            :key="column.key"
            class="px-3 py-2 border-b border-slate-100"
            :class="column.numeric ? 'text-right tabular-nums whitespace-nowrap' : 'text-left'"
          >
            {{ row[column.key]?.text }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="table.footer">
        <tr class="font-semibold text-slate-900">
          <td
            v-for="column in table.columns"
            :key="column.key"
            class="px-3 py-3 border-t border-slate-300"
            :class="column.numeric ? 'text-right tabular-nums whitespace-nowrap' : 'text-left'"
          >
            {{ table.footer[column.key]?.text }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
