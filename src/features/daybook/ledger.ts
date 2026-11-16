/** Cash columns for one daybook line. A transfer is shown, and left out of both totals. */
export function movementTotals(kind: string, amounts: bigint[]): { moneyIn: bigint; moneyOut: bigint } {
  if (kind === 'transfer') return { moneyIn: 0n, moneyOut: 0n }
  let moneyIn = 0n
  let moneyOut = 0n
  for (const amount of amounts) {
    if (amount > 0n) moneyIn += amount
    else if (amount < 0n) moneyOut += -amount
  }
  return { moneyIn, moneyOut }
}

/** Unpaid part of a sale. Other entries do not create a customer debt here. */
export function saleStillOwes(kind: string, saleMinor: bigint, moneyIn: bigint): bigint {
  if (kind !== 'sale' || saleMinor <= moneyIn) return 0n
  return saleMinor - moneyIn
}
