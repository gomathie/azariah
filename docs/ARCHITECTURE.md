# Architecture

Current shape of the app. Decisions live in `docs/architecture/ADR.md`. This page lists what the code does today.

## Stack

Vue 3, TypeScript, Vite, Pinia, Vue Router, Vue I18n, Tailwind CSS 4. Supabase provides Postgres, Auth and Row Level Security. The browser uses the publishable key only.

## Money

Amounts are `bigint` minor units in Postgres and in the client. The screen formats them. A payment or expense is a transaction plus a signed `money_movements` row. Account balance is the sum of those rows. Customer debt is the receivable minus the payments applied to it.

## Writes

The browser does not insert into `transactions`, `money_movements`, `receivables` or `credit_allocations`. These functions do that work, and each one is safe to call again with the same operation id:

| Function | What it records |
|---|---|
| `rpc_create_business_and_owner` | Business, owner membership, Cash, Mobile Money, starter categories |
| `rpc_create_sale` | Sale, money received, and the amount still owed |
| `rpc_record_expense` | Everyday spending, cash down |
| `rpc_record_stock_purchase` | Goods bought to resell, cash down, not an everyday expense |
| `rpc_record_owner_movement` | Owner putting money in or taking money out |
| `rpc_record_opening_balance` | Starting cash, not a sale |
| `rpc_record_collection` | A later customer payment. Oldest debt is settled first. Not a sale |
| `rpc_get_customer_statement` | What the customer was charged, what they paid, and what they still owe |

`post_money_event` is an internal helper. The app cannot call it.
