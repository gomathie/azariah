# Data dictionary

Amounts are minor units (`bigint`). GHS uses 2, so 100.00 is stored as 10000. A transaction `amount_minor` is always positive. The kind says what happened. A money movement is signed: money in is positive, money out is negative.

## Tables

| Table | What a row is |
|---|---|
| `profiles` | One row per signed-in user |
| `businesses` | Name, country, time zone, currency, minor unit |
| `business_memberships` | Who can open a business, and as which role |
| `business_preferences` | Extra settings for one business |
| `money_accounts` | Cash, Mobile Money, bank, or other |
| `categories` | Sale, everyday expense, or stock purchase |
| `contacts` | A customer |
| `transactions` | One business event |
| `money_movements` | The signed change to one account |
| `receivables` | What a credit sale added to a customer's debt |
| `credit_allocations` | How a payment, or a reversal, was applied to a receivable |
| `attachments` | Reserved for a future file. No upload screen yet |
| `audit_events` | Who did what, including reversals and exports |
| `sync_operations` | The client operation id and the stored result, so a retry does not post twice |
| `shop_people` | A person, the phone they use, and their role: `staff` or `manager` (shown as Admin). Staff is the default. Signing in still uses `business_memberships` |
| `documents` | One invoice or receipt for a sale or a payment. Amounts are copied from that entry. Issuing a paper does not post money |
| `document_counters` | The last invoice number and the last receipt number for a business. Not readable from the app |

## Status

- Transaction status: `posted` or `reversed`. A reversal is a new posted transaction of kind `reversal`. The original becomes `reversed`.
- Document kind: `invoice` or `receipt`. Document status: `issued` or `void`. Reversing the entry sets its papers to `void`. Numbers are not reused.
- Membership status: `active`, `invited`, or `removed`. Invites in the current function create an `active` row because the person must already have an account.
- Membership role: `owner`, `manager`, `staff`, `viewer`.

## Views

- `v_account_balances`: sum of movements for each account. There is no stored balance.
- `v_customer_balances`: receivable amount minus allocations, ignoring reversed receivables.

## Dates

`occurred_at` is UTC. `business_date` is that moment in the business time zone, set inside the RPC.
