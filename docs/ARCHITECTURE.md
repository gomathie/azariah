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
| `rpc_transfer_between_accounts` | Money moved between two accounts. The two movements sum to zero |
| `rpc_reverse_transaction` | Owner or manager undoes a posted entry. The original stays, marked reversed |
| `rpc_get_dashboard_summary` | Sales, money received, spending, stock purchases, net cash, debts, and current account balances |
| `rpc_report_sales` | Posted sales in a date range |
| `rpc_report_money_received` | Cash from sales and later payments. Transfers and owner money are left out |
| `rpc_report_expenses` | Posted everyday expenses in a date range |
| `rpc_report_stock_purchases` | Posted stock purchases in a date range |
| `rpc_report_account_statement` | Opening balance, lines, and closing balance for one account |
| `rpc_report_cash_movement` | Every posted movement, with transfers listed and left out of the net |
| `rpc_report_customer_debts` | Customers who still owe money |
| `rpc_export_business_data` | Owner-only copy of the business records. Writes an audit row |
| `rpc_invite_member` | Owner or manager invites someone who already has an account. Only an owner can grant owner |
| `rpc_change_membership` | Changes role or status. The last active owner cannot be removed or demoted |

`post_money_event` is an internal helper. The app cannot call it.

## Offline

Sales and expenses that fail because the phone is offline are stored in Dexie (`azaria.pending_operations`) and sent later with the same operation id. Payments, transfers, and reversals need a connection.

## Lists

The daybook loads one page at a time, newest first, using `(business_date, created_at, id)`. The index is `transactions_daybook_keyset_idx`. Dashboard and report totals are computed in Postgres.

