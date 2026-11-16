import { z } from 'zod'

/**
 * Client-side mirrors of the rpc_* arguments. Amounts are bigint minor units (ADR-001).
 * The database re-checks every rule; these schemas fail fast before a request is sent.
 */

const clientOperationId = z.uuid()
const businessId = z.uuid()
const occurredAt = z.string().min(1)
const positiveMinor = z.bigint().positive()
const description = z.string().max(240).nullable()
const note = z.string().max(1000).nullable()

export const SaleInput = z
  .object({
    clientOperationId,
    businessId,
    occurredAt,
    amountMinor: positiveMinor,
    receivedMinor: z.bigint().nonnegative(),
    moneyAccountId: z.uuid().nullable(),
    contactId: z.uuid().nullable(),
    categoryId: z.uuid().nullable(),
    description,
    note,
  })
  .refine((value) => value.receivedMinor <= value.amountMinor, { path: ['receivedMinor'] })
  .refine((value) => value.receivedMinor === value.amountMinor || value.contactId !== null, {
    path: ['contactId'],
  })
  .refine((value) => value.receivedMinor === 0n || value.moneyAccountId !== null, {
    path: ['moneyAccountId'],
  })

export const ExpenseInput = z.object({
  clientOperationId,
  businessId,
  occurredAt,
  amountMinor: positiveMinor,
  moneyAccountId: z.uuid(),
  categoryId: z.uuid(),
  description,
  note,
})

export const CollectionInput = z.object({
  clientOperationId,
  businessId,
  occurredAt,
  contactId: z.uuid(),
  amountMinor: positiveMinor,
  moneyAccountId: z.uuid(),
  note,
})

export const TransferInput = z
  .object({
    clientOperationId,
    businessId,
    occurredAt,
    fromAccountId: z.uuid(),
    toAccountId: z.uuid(),
    amountMinor: positiveMinor,
    note,
  })
  .refine((value) => value.fromAccountId !== value.toAccountId, { path: ['toAccountId'] })

export const OwnerMovementInput = z.object({
  clientOperationId,
  businessId,
  occurredAt,
  amountMinor: positiveMinor,
  moneyAccountId: z.uuid(),
  direction: z.enum(['contribution', 'withdrawal']),
  note,
})

export type SaleInput = z.infer<typeof SaleInput>
export type ExpenseInput = z.infer<typeof ExpenseInput>
export type CollectionInput = z.infer<typeof CollectionInput>
export type TransferInput = z.infer<typeof TransferInput>
export type OwnerMovementInput = z.infer<typeof OwnerMovementInput>
