<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import type { DaybookRow } from '@/features/daybook/api'
import { formatMoney, formatSignedMoney } from '@/utils/money'

/** One daybook entry: what it was, who and where, and the money that moved with its direction. */
const props = defineProps<{ row: DaybookRow; currency: string }>()
const { t, locale } = useI18n()

const ICONS: Record<string, IconName> = {
  sale: 'sale',
  collection: 'payment',
  expense: 'expense',
  stock_purchase: 'stock',
  transfer: 'transfer',
  owner_contribution: 'owner',
  owner_withdrawal: 'owner',
  opening_balance: 'flag',
  reversal: 'undo',
}

/** Money that actually moved for this entry. Zero for a transfer and for a sale fully on credit. */
const cash = computed(() => (props.row.money_movements ?? []).reduce((sum, m) => sum + m.amount_minor, 0))
const reversed = computed(() => props.row.status === 'reversed')

const label = computed(() => {
  const kind = t(`daybook.kinds.${props.row.kind}`)
  return props.row.description ? `${kind} — ${props.row.description}` : kind
})

const amountText = computed(() =>
  cash.value === 0
    ? formatMoney(BigInt(props.row.amount_minor), props.currency, locale.value)
    : formatSignedMoney(BigInt(cash.value), props.currency, locale.value),
)

// Direction is carried by the + or − sign; colour only repeats it.
const tone = computed(() => {
  if (cash.value > 0) return { text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700' }
  if (cash.value < 0) return { text: 'text-red-700', badge: 'bg-red-50 text-red-700' }
  return { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' }
})

/** The quiet second line: customer, account, and what is still unpaid on a credit sale. */
const detail = computed(() => {
  const parts: string[] = []
  const moves = props.row.money_movements ?? []
  if (props.row.contact?.name) parts.push(props.row.contact.name)
  if (props.row.kind === 'transfer') {
    const from = moves.find((m) => m.amount_minor < 0)?.money_account?.name
    const to = moves.find((m) => m.amount_minor > 0)?.money_account?.name
    if (from && to) parts.push(t('daybook.transferRoute', { from, to }))
  } else {
    const names = [...new Set(moves.map((m) => m.money_account?.name).filter((n): n is string => !!n))]
    if (names.length) parts.push(names.join(', '))
  }
  if (props.row.kind === 'sale' && !reversed.value) {
    const unpaid = props.row.amount_minor - cash.value
    if (unpaid > 0) {
      parts.push(t('daybook.notPaid', { amount: formatMoney(BigInt(unpaid), props.currency, locale.value) }))
    }
  }
  return parts.join(' · ')
})
</script>

<template>
  <RouterLink
    :to="{ name: 'transaction', params: { transactionId: row.id } }"
    class="px-3 py-3 flex items-center gap-3 min-h-14"
  >
    <span class="size-10 shrink-0 rounded-full flex items-center justify-center" :class="tone.badge">
      <AppIcon :name="ICONS[row.kind] ?? 'paper'" class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-medium text-slate-900" :class="reversed ? 'line-through decoration-slate-400' : ''">{{
        label
      }}</span>
      <span v-if="detail" class="block text-sm text-slate-600">{{ detail }}</span>
      <span
        v-if="reversed"
        class="inline-block mt-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 px-2 py-0.5"
        >{{ t('daybook.reversed') }}</span
      >
    </span>
    <span
      class="font-semibold tabular-nums whitespace-nowrap"
      :class="[tone.text, reversed ? 'line-through decoration-slate-400' : '']"
      >{{ amountText }}</span
    >
  </RouterLink>
</template>
