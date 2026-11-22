# Azaria — Architecture Decision Records

Compact ADRs for the decisions that shape the codebase. Each one answers: what we chose, why, and what it rules out. Spec: `Azaria_Master_Development_Prompt.md`.

## ADR-001 Money is stored as `bigint` minor units

- Every monetary column is `amount_minor bigint` (e.g. GHS 12.50 = 1250). The business row carries `currency_code char(3)` and `minor_unit smallint` (2 for GHS, 0 for XOF).
- Formatting to a display string happens only in the UI through `formatMoney(minor, currency)`; parsing from user input goes through `parseMoney(text, minorUnit)`.
- Ruled out: `numeric`/float arithmetic in the client; multi-currency rows in MVP (one base currency per business, enforced by check).

## ADR-002 All financial mutations go through PostgreSQL RPC functions

- Functions live in `public` with an `rpc_` prefix (`rpc_create_sale`, `rpc_record_collection`, …), are `SECURITY DEFINER`, pin `search_path = public, pg_temp`, and start by calling `assert_member(business_id, allowed_roles)`.
- `EXECUTE` is revoked from `public`/`anon` and granted only to `authenticated`.
- Every mutation takes `p_client_operation_id uuid`. The function inserts into `sync_operations (business_id, client_operation_id)` first; on unique violation it returns the stored result instead of re-posting. This is the idempotency guarantee for offline replays.
- Ruled out: multi-step browser writes for one business event; a generic update endpoint.

## ADR-003 Event + movement model, balances derived, never stored

- `transactions` is the source business event (kind, business_date, amounts, status, reversal link).
- `money_movements` holds one signed `amount_minor` row per account touched. Account balance = `sum(amount_minor)` over that account (view `v_account_balances`).
- `receivables` is one row per credit sale; `credit_allocations` records each collection applied. Outstanding = `receivable.amount_minor - sum(allocations)`.
- Transaction kinds: `sale`, `collection`, `expense`, `stock_purchase`, `transfer`, `owner_contribution`, `owner_withdrawal`, `opening_balance`, `reversal`.
- A reversal creates a new `reversal` transaction with mirrored movements and marks the original `status = 'reversed'`; nothing is deleted.
- Ruled out: stored running balances in MVP (reconsider with reconciliation tests if dashboards get slow).

## ADR-004 Tenant isolation: RLS on every table, explicit grants, membership helper

- `supabase/config.toml` sets `auto_expose_new_tables = false`; every exposed table gets explicit `GRANT`s.
- Helper `is_member(p_business_id uuid, p_roles business_role[] default null) returns boolean` is `STABLE SECURITY DEFINER` and reads `business_memberships` for `auth.uid()` with `status = 'active'`.
- Select policies: `is_member(business_id)`. Insert/update/delete policies on financial tables: none for `authenticated` (writes only via RPC). Settings tables (categories, contacts, money_accounts) allow owner/manager writes directly with `with check (is_member(business_id, '{owner,manager}'))`.
- Views use `security_invoker = true`.
- Ruled out: trusting the client's selected `business_id`; policies that call non-pinned functions.

## ADR-005 Business-local date is stored on the row

- `transactions.business_date date` is computed server-side inside the RPC as `(p_occurred_at at time zone business.timezone)::date` and indexed with `(business_id, business_date)`.
- Reports and daily totals group by `business_date`; `occurred_at timestamptz` keeps the exact instant.

## ADR-006 Offline queue in Dexie, foreground sync only

- Dexie DB `azaria` with table `pending_operations {id (client_operation_id), business_id, kind, payload, created_at, status, attempts, last_error}` and `cache_*` tables for read-model snapshots.
- Supported offline kinds for MVP: `sale`, `expense`. Others are online-only and the UI says so when offline.
- Sync runs on app open, on `online` event, and on a manual button, in insertion order, with exponential backoff per operation. A record is removed only after the RPC returns success or a "duplicate" result.
- Ruled out: Background Sync API as the primary mechanism (unreliable on mobile browsers).

## ADR-007 Stack versions (locked by `package-lock.json`)

Scaffolded with `create-vue` so the Vite/Vue/Vitest/Playwright versions are mutually compatible. Added: Tailwind CSS 4 via `@tailwindcss/vite`, Vue I18n, Dexie, `@supabase/supabase-js`, Zod, `vite-plugin-pwa`, `@vueuse/core`. The Supabase CLI runs through `npx supabase` (devDependency), with Docker for the local stack.

## ADR-008 Environments and hosting

- Local: Supabase CLI + Docker, `supabase/migrations` applied by `supabase db reset` (local only).
- Staging and production: two separate Supabase cloud projects; frontend is a static Vite build on Cloudflare Pages or equivalent.
- Ruled out: any shared infrastructure with DEKA ERP; service-role keys in the browser.

## ADR-009 Platform support access is consent-based and read-only

- A platform admin (the Azaria support team) is a row in `platform_admins`, added only with SQL by whoever holds the database. No API creates one.
- Without the owner's consent an admin sees a directory only: shop name, country, currency, status, owner email, member count, last entry date. No sales, balances, customers or entries.
- An owner grants access for 1 hour to 7 days with `rpc_grant_support_access` and can revoke it at any time. One live grant per shop.
- While a grant is live the admin can read that one shop. `is_member(business_id)` returns true for them only when no role is requested, which is how every read policy and read function calls it. Every write names its roles, so support access cannot satisfy a write.
- An admin can suspend or reactivate a shop with a reason. A suspended shop is closed to its members.
- Every grant, revoke, look, search and status change is written to `audit_events` and shown to the owner.
- Why: spec principle 5 says administrators do not automatically get access to an entrepreneur's finances, and §6.1 says platform support does not bypass business-level privacy. Support still has to be possible when something breaks.
- Ruled out: a role that reads every shop; support writes of any kind; a service-role key in a support tool; impersonating the owner.
- Rule for later work: a new function that only reads may call `is_member(p_business_id)` or `assert_member(p_business_id)` without roles. A function or policy that writes must name roles. `supabase/tests/0016_support_access.test.sql` fails if a write opens to support.
