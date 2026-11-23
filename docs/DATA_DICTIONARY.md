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

### Support access tables (2026-11-22)

| Table | What it holds |
|---|---|
| `platform_admins` | `user_id`, `note`, `created_at`. The support team. Not readable or writable through the API. |
| `support_grants` | `business_id`, `granted_by`, `reason`, `created_at`, `expires_at`, `revoked_at`, `revoked_by`. A grant is live when `revoked_at` is null and `expires_at` is in the future. At most 7 days long. Owners and managers of the shop can read their rows. |

Audit actions added: `support.granted`, `support.revoked`, `support.viewed`, `support.status_changed`, `support.searched`.

### Billing tables (2026-11-23)

| Table | What it holds |
|---|---|
| `billing_products` | `code` (`plus_1m`, `plus_3m`, `plus_12m`), `months`, `amount_minor`, `currency_code`, `active`, `sort_order`. The periods on sale. Readable by any signed-in user; changed with SQL only. The seeded prices are placeholders. |
| `business_entitlements` | `business_id`, `plus_until`, `trial_used`, `updated_at`. One row per shop that ever had Plus. Members can read their own shop's row. Nobody can write it through the API. |
| `billing_payments` | `business_id`, `product_code`, `months`, `reference` (unique, `azp-` and 32 hex characters), `list_amount_minor`, `discount_code_id`, `percent_off`, `amount_minor`, `currency_code`, `status`, `channel`, `paid_at`, `created_by`. One row per attempt to pay. Owner and manager can read. |
| `discount_codes` | `code` (capitals and digits, 6 to 24), `percent_off` (1 to 100), `valid_until` (null means for ever), `max_uses` (null means no limit), `note`, `active`, `created_by`. Not readable through the API. |
| `billing_events` | `event_key` (unique), `event_type`, `reference`, `payload`, `received_at`, `processed_at`. What Paystack sent. The payload holds the payer's email and masked card or phone details, so no API role can read it. |
| `billing_settings` | One row. `payments_on` (false until the platform admin turns payments on for every shop), `updated_at`, `updated_by`. Not readable through the API; `rpc_billing_status` reports the switch. |

Payment status: `pending` when opened, `paid` once Paystack confirms it (or at once for a 100% code). `failed` is reserved; an abandoned checkout stays `pending` and is hidden from the owner after a day.

Audit actions added: `billing.trial_started`, `billing.paid`, `billing.discount_created`, `billing.discount_changed`.

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
