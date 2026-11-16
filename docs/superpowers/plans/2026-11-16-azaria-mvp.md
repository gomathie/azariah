# Azaria MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Vue 3 + Supabase PWA where a small-business owner creates a business, records sales/expenses/collections/transfers, sees accurate balances and customer debts, and can record simple entries offline.

**Architecture:** Supabase PostgreSQL holds events (`transactions`), signed account movements (`money_movements`) and receivable allocations; all writes go through idempotent `rpc_*` functions guarded by membership checks and RLS. The Vue client reads via audited RLS selects, writes via RPC, and queues sales/expenses in Dexie when offline.

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Vue Router, Vue I18n, Tailwind CSS 4, Dexie, `@supabase/supabase-js`, Zod, vite-plugin-pwa, Vitest, Playwright, Supabase CLI (local Docker stack), pgTAP-style SQL tests via `supabase test db`.

**Spec:** `Azaria_Master_Development_Prompt.md` (v1.1). ADRs: `docs/architecture/ADR.md`.

## Where we are

Updated 2026-11-16. This table is the position marker. The task sections below stay the instructions; this table says which instruction to follow.

**You are here: Task 5 — Auth, onboarding and business store.** Tasks 6, 7 and 8 were built ahead of it and their checks passed. Do not rebuild them. Close Task 5, then continue at Task 9.

How every person and agent uses this table:

1. Work only the row marked **You are here**.
2. Read that task's files, rules and steps further down this file.
3. Add the missing test first when the task still lacks one.
4. Run the check named in the task. A task is **Verified** only after that check has passed. Files existing is not enough.
5. Change the finished row to **Verified**, put the command and result in Evidence, and move **You are here** to the next row that is not Verified.
6. Replace the Status checkpoint in `AGENTS.md` with the same point. The owner commits; do not commit unless asked.

| Task | Status | Evidence |
|---|---|---|
| 1. Project configuration | Verified | `client.spec.ts` passed again on 2026-11-16 (unit run: 13 tests). Production build was green in the earlier session and was not re-run today. |
| 2. Database schema | Verified | `0001_schema.test.sql` ok. `npx supabase test db`: 5 files, 92 tests, PASS. |
| 3. RLS, grants, membership | Verified | `0003_rls.test.sql` ok in the same run. |
| 4. Create business RPC | Verified | `0002_business_rpc.test.sql` ok in the same run. |
| 5. Auth, onboarding, business store | **You are here** | Screens, stores and `e2e/onboarding.spec.ts` exist. `src/stores/__tests__/business.spec.ts` is missing. Playwright has not been run. |
| 6. Money parsing and Zod schemas | Verified | `money.spec.ts` and `schemas.spec.ts` passed on 2026-11-16. `1.2.3` is rejected. |
| 7. `rpc_create_sale` | Verified | `0004_sale.test.sql` ok (scenarios A, B, I, K and the rejection cases). |
| 8. Expense, stock, owner movement, opening balance | Verified | `0005_spend.test.sql` ok (D, E, G, H, replay, zero amount, other-business account). |
| 9. Add Sale and Add Expense screens | Not started | Sale, expense, home and daybook screens are placeholders. |
| 10. Collection and customer statement | Not started | |
| 11. Transfers and account screens | Not started | |
| 12. Reversal and daybook | Not started | |
| 13. Dashboard summary | Not started | |
| 14. Offline queue and sync | Not started | |
| 15. Offline end-to-end test | Not started | |
| 16. Reports and CSV export | Not started | |
| 17. Business data export | Not started | |
| 18. Membership management | Not started | |
| 19. Help, privacy, settings, French | Not started | |
| 20. CI and remaining docs | Not started | |

Milestone exits, in order: Task 5 closes Milestone 1. Tasks 9–13 close Milestone 2 (domain scenarios A–L). Tasks 14–17 close Milestone 3. Tasks 18–20 close Milestone 4.

## Global Constraints

- Money in `bigint` minor units everywhere; no float arithmetic on amounts (spec §4.4, ADR-001).
- One base currency per business; `currency_code` stored on business and on every monetary row.
- Every business-owned table has `business_id uuid not null`, RLS enabled, explicit grants; `auto_expose_new_tables = false`.
- Financial mutations only via `rpc_*` functions taking `p_client_operation_id uuid`; replay must not duplicate (spec §4.2, §5.3).
- Customer-facing copy uses: "Add sale", "Money received", "Expense", "Bought stock", "Customer owes", "Record payment", "Money moved", "Money available" (spec §3.4).
- Never display `Sales − Spending = Profit`. Dashboard labels: Sales, Money received, Operating expenses paid, Stock purchases paid, Net cash movement, Customer debts (spec §4.3).
- Timestamps in UTC (`timestamptz`), `business_date` in business timezone (ADR-005).
- No service-role key in client code or `.env` files committed; `.env.example` has placeholders only.
- Default country Ghana, currency GHS, English UI, i18n framework ready for French.
- Mobile bottom nav: Home · Daybook · Add (+) · Customers · Reports.

## Review Focus

1. **Amount input with locale separators** ("1,250.50", "1 250,50", "GH₵ 12"): must parse to the right minor units or reject clearly, never silently truncate. Test in Task 6 (`parseMoney`).
2. **Collection larger than outstanding debt**: must be rejected with a localizable error, not create negative debt. Test in Task 10 (`rpc_record_collection`).
3. **Transfer to the same account, or zero/negative amounts**: must be rejected server-side. Tests in Task 11 and Task 8.
4. **Sale entered just before midnight in Accra vs UTC**: must land on the Accra business date. Test in Task 8 (K).
5. **Offline queue replayed after the user switches business or signs out**: operations carry their own `business_id`; must sync only when the same user is signed in, otherwise stay pending with a visible "Needs attention" state. Test in Task 15.

---

## Milestone 1 — Foundation

### Task 1: Project configuration (Tailwind, i18n, PWA, env, Supabase client)

**Files:**
- Modify: `vite.config.ts`, `src/main.ts`, `src/App.vue`, `index.html`, `package.json`, `.gitignore`
- Create: `src/assets/main.css`, `src/i18n/index.ts`, `src/i18n/en.json`, `src/i18n/fr.json`, `src/lib/supabase/client.ts`, `.env.example`, `README.md`
- Delete: scaffold samples (`src/components/HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`, `icons/*`, `src/stores/counter.ts`, `src/views/AboutView.vue`)
- Test: `src/lib/supabase/__tests__/client.spec.ts`

**Interfaces:**
- Produces: `supabase` (typed `SupabaseClient<Database>`) from `src/lib/supabase/client.ts`; `i18n` plugin with `t()` keys namespaced `nav.*`, `auth.*`, `sale.*`, `expense.*`, `dashboard.*`, `errors.*`; env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 1:** Write `client.spec.ts` asserting `createClient` throws `MissingSupabaseConfigError` when env vars are empty, and returns a client otherwise.
- [ ] **Step 2:** Run `npm run test:unit -- client` — expect FAIL (module missing).
- [ ] **Step 3:** Implement `client.ts` exporting `supabase` and `createSupabaseClient(url, key)`; add Tailwind (`@import "tailwindcss"` in `main.css`, `tailwindcss()` plugin in Vite), `vue-i18n` with `legacy: false`, `VitePWA({ registerType: 'prompt', manifest: { name: 'Azaria', short_name: 'Azaria', theme_color: '#0f766e' } })`.
- [ ] **Step 4:** `npm run test:unit -- client` PASS; `npm run build` succeeds.
- [ ] **Step 5:** Commit `chore: configure tailwind, i18n, pwa, supabase client`.

### Task 2: Database schema migration

**Files:**
- Create: `supabase/migrations/20261116000100_schema.sql`
- Test: `supabase/tests/0001_schema.sql` (pgTAP)

**Interfaces:**
- Produces enums `business_role ('owner','manager','staff','viewer')`, `membership_status ('active','invited','removed')`, `account_type ('cash','mobile_money','bank','other')`, `category_kind ('sale','operating_expense','stock_purchase')`, `transaction_kind` (ADR-003), `transaction_status ('posted','reversed')`.
- Tables: `profiles`, `businesses`, `business_memberships`, `money_accounts`, `categories`, `contacts`, `transactions`, `money_movements`, `receivables`, `credit_allocations`, `audit_events`, `sync_operations`, `attachments`.
- Views: `v_account_balances(business_id, money_account_id, balance_minor)`, `v_customer_balances(business_id, contact_id, outstanding_minor)`.
- Trigger: `profiles` row auto-created on `auth.users` insert.

- [ ] **Step 1:** Write pgTAP test: `has_table` for each table, `col_type_is(transactions, amount_minor, bigint)`, `has_index(transactions, transactions_business_date_idx)`, RLS enabled on every table (`is(relrowsecurity, true)`).
- [ ] **Step 2:** `npx supabase test db` — expect FAIL.
- [ ] **Step 3:** Write the migration. Key constraints: `check (amount_minor > 0)` on transactions; `unique (business_id, client_operation_id)` on sync_operations; `unique (business_id, user_id)` on memberships; `check (money_account_id_from <> money_account_id_to)` on transfers (enforced in RPC); FK all `business_id` to businesses.
- [x] **Step 4:** `npx supabase db reset && npx supabase test db` PASS.
- [ ] **Step 5:** Commit `feat(db): core schema`.

### Task 3: Membership helper, RLS policies, grants

**Files:**
- Create: `supabase/migrations/20261116000200_rls.sql`
- Test: `supabase/tests/0002_rls.sql`

**Interfaces:**
- Produces `is_member(p_business_id uuid, p_roles business_role[] default null) returns boolean`; `assert_member(p_business_id uuid, p_roles business_role[]) returns void` (raises `AZ_FORBIDDEN`).

- [ ] **Step 1:** pgTAP test using `set local role authenticated; set local request.jwt.claims` for two users and two businesses: user A selects own rows, zero rows of B; insert into `transactions` as authenticated is denied; anon sees nothing.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Write policies per ADR-004; grants: `select` on all tables to `authenticated`; `insert/update` on `categories, contacts, money_accounts, businesses(owner only), business_preferences` to `authenticated` under policies; nothing to `anon`; revoke all on `audit_events`, `sync_operations` writes.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(db): rls policies and grants`.

### Task 4: `rpc_create_business_and_owner`

**Files:**
- Create: `supabase/migrations/20261116000300_rpc_business.sql`
- Test: `supabase/tests/0003_business.sql`

**Interfaces:**
- Produces `rpc_create_business_and_owner(p_client_operation_id uuid, p_name text, p_business_type text, p_country_code char(2), p_timezone text, p_currency_code char(3)) returns jsonb` → `{business_id, memberships:[...]}`; seeds Cash + Mobile Money accounts and default categories by `p_business_type` (retail/food/services/other).
- Produces `rpc_sync_begin(business_id, client_operation_id, kind) returns jsonb` (null if new, stored result if replay) and `rpc_sync_finish(...)` used by every later RPC.

- [ ] **Step 1:** pgTAP: calling as user A creates business, owner membership, 2 accounts, ≥6 categories; replaying same `p_client_operation_id` returns the same `business_id` and creates no second business.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat(db): create business rpc`.

### Task 5: Auth, onboarding and business store (UI)

**Files:**
- Create: `src/stores/auth.ts`, `src/stores/business.ts`, `src/features/auth/{LoginView,SignUpView,ResetPasswordView}.vue`, `src/features/onboarding/CreateBusinessView.vue`, `src/router/index.ts` (replace), `src/app/AppShell.vue`, `src/components/ui/{AppButton,AppInput,AppSelect,AppAlert}.vue`
- Test: `src/stores/__tests__/business.spec.ts`, `e2e/onboarding.spec.ts`

**Interfaces:**
- `useAuthStore()`: `user`, `session`, `signIn(email, password)`, `signUp(email, password)`, `signOut()`, `resetPassword(email)`.
- `useBusinessStore()`: `businesses: Business[]`, `currentBusinessId`, `current` getter, `load()`, `select(id)`, `createBusiness(input: CreateBusinessInput): Promise<string>` (calls `rpc_create_business_and_owner` with `crypto.randomUUID()`).
- Router guards: `requiresAuth`, `requiresBusiness`; `currentBusinessId` persisted in `localStorage['azaria.business']`.

- [ ] **Step 1:** Unit test `business.spec.ts` with mocked supabase: `createBusiness` passes a UUID op id and sets `currentBusinessId`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement views and stores; onboarding form defaults: country `GH`, currency `GHS`, timezone `Africa/Accra`.
- [ ] **Step 4:** Unit PASS; `npx playwright test onboarding` against local Supabase: sign up → create "Ama's Provision Shop" → land on Home.
- [ ] **Step 5:** Commit `feat: auth, onboarding, business switching`.

**Milestone 1 exit:** new user signs up, creates a business, logs in; RLS tests pass.

---

## Milestone 2 — Daily business records

### Task 6: Money utilities and shared schemas

**Files:**
- Create: `src/utils/money.ts`, `src/types/schemas.ts`
- Test: `src/utils/__tests__/money.spec.ts`

**Interfaces:**
- `parseMoney(text: string, minorUnit: number): bigint | null` (accepts `1250`, `1,250.50`, `1 250,50`; rejects more decimals than `minorUnit`, negatives, empty).
- `formatMoney(minor: bigint | number, currency: string, locale: string): string`.
- Zod schemas `SaleInput`, `ExpenseInput`, `CollectionInput`, `TransferInput`, `OwnerMovementInput` mirroring the RPC parameters.

- [x] **Step 1:** Tests: `parseMoney('1,250.50', 2) === 125050n`; `parseMoney('12.345', 2) === null`; `parseMoney('1 250,50', 2) === 125050n`; `formatMoney(125050n, 'GHS', 'en-GH')` contains `1,250.50`; `parseMoney('100', 0)` for XOF `=== 100n`.
- [ ] **Steps 2–5:** FAIL, implement, PASS, commit `feat: money parsing and formatting`.

### Task 7: `rpc_create_sale`

**Files:**
- Create: `supabase/migrations/20261116000400_rpc_sale.sql`
- Test: `supabase/tests/0004_sale.sql`

**Interfaces:**
- `rpc_create_sale(p_client_operation_id uuid, p_business_id uuid, p_occurred_at timestamptz, p_amount_minor bigint, p_received_minor bigint, p_money_account_id uuid, p_contact_id uuid, p_category_id uuid, p_description text, p_note text) returns jsonb` → `{transaction_id, receivable_id|null, business_date}`.
- Rules: `0 ≤ received ≤ amount`; if `received < amount` then `contact_id` required and a receivable of `amount − received` is created; movement row for `received` when > 0; audit event `sale.created`.

- [x] **Step 1:** pgTAP scenarios A and B from spec §12.1 plus I (replay) and K (23:30 Accra on 2026-01-01 → `business_date = 2026-01-01`; 23:30 UTC → `2026-01-01` is 23:30 Accra since Accra is UTC+0; use `America/New_York` business for a differing case: 23:30 UTC = 18:30 local). Credit without contact → error `AZ_CONTACT_REQUIRED`.
- [ ] **Steps 2–5:** FAIL, implement, PASS, commit `feat(db): create sale rpc`.

### Task 8: `rpc_record_expense` and `rpc_record_stock_purchase`, owner movements, opening balance

**Files:**
- Create: `supabase/migrations/20261116000500_rpc_spend.sql`
- Test: `supabase/tests/0005_spend.sql`

**Interfaces:**
- `rpc_record_expense(op, business, occurred_at, amount_minor, money_account_id, category_id, description, note)`; same signature for `rpc_record_stock_purchase`.
- `rpc_record_owner_movement(op, business, occurred_at, amount_minor, money_account_id, direction 'contribution'|'withdrawal', note)`.
- `rpc_record_opening_balance(op, business, money_account_id, amount_minor, as_of date)`.

- [x] **Step 1:** pgTAP scenarios D, E, G, H; amount `0` → `AZ_INVALID_AMOUNT`; account from another business → `AZ_FORBIDDEN`.
- [ ] **Steps 2–5:** commit `feat(db): expense, stock purchase, owner movements`.

### Task 9: Contacts and categories UI, Add Sale and Add Expense screens

**Files:**
- Create: `src/features/sales/AddSaleView.vue`, `src/features/expenses/AddExpenseView.vue`, `src/features/customers/{CustomersView,CustomerPicker}.vue`, `src/components/ui/MoneyInput.vue`, `src/stores/catalog.ts` (accounts, categories, contacts), `src/features/sales/api.ts`, `src/features/expenses/api.ts`
- Test: `src/components/ui/__tests__/MoneyInput.spec.ts`, `e2e/add-sale.spec.ts`

**Interfaces:**
- `createSale(input: SaleInput): Promise<SaleResult>` and `createExpense(input: ExpenseInput)` in `api.ts` call the RPCs through `src/lib/supabase/rpc.ts: callRpc(name, params)` which maps `AZ_*` errors to i18n keys.
- `MoneyInput` emits `update:modelValue` as `bigint | null`, props `currency`, `minorUnit`.

- [ ] **Step 1:** `MoneyInput.spec.ts`: typing `12.5` emits `1250n`; invalid shows `errors.invalid_amount`.
- [ ] **Step 4:** Playwright: record GHS 100 sale, 60 received MoMo, 40 credit to "Kofi"; expect success toast and Daybook row.
- [ ] **Step 5:** Commit `feat: add sale and add expense screens`.

### Task 10: `rpc_record_collection` and customer statement

**Files:**
- Create: `supabase/migrations/20261116000600_rpc_collection.sql`, `src/features/customers/{CustomerDetailView,RecordPaymentView}.vue`
- Test: `supabase/tests/0006_collection.sql`, `e2e/collection.spec.ts`

**Interfaces:**
- `rpc_record_collection(op, business, occurred_at, contact_id, amount_minor, money_account_id, note)`: allocates FIFO across open receivables of the contact; error `AZ_EXCEEDS_DEBT` if amount > outstanding; creates `collection` transaction + movement; never a sale.
- `rpc_get_customer_statement(business, contact_id, from, to) returns jsonb` rows `{date, kind, description, debit_minor, credit_minor, balance_minor}`.

- [ ] **Step 1:** pgTAP scenario C; overpayment → `AZ_EXCEEDS_DEBT`; sales total unchanged after collection (assert via `sum(amount_minor) where kind='sale'`).
- [ ] **Steps 2–5:** commit `feat: customer collections and statement`.

### Task 11: `rpc_transfer_between_accounts`, accounts screens

**Files:**
- Create: `supabase/migrations/20261116000700_rpc_transfer.sql`, `src/features/accounts/{AccountsView,AccountStatementView,TransferView}.vue`
- Test: `supabase/tests/0007_transfer.sql`

**Interfaces:**
- `rpc_transfer_between_accounts(op, business, occurred_at, from_account_id, to_account_id, amount_minor, note)`; same account → `AZ_SAME_ACCOUNT`; two movements (−, +), sum zero.

- [ ] **Step 1:** pgTAP scenario F; `sum(amount_minor)` of movements for the transaction = 0.
- [ ] **Steps 2–5:** commit `feat: account transfers and statements`.

### Task 12: `rpc_reverse_transaction`, Daybook list/detail

**Files:**
- Create: `supabase/migrations/20261116000800_rpc_reverse.sql`, `src/features/daybook/{DaybookView,TransactionDetailView}.vue`, `src/features/daybook/api.ts`
- Test: `supabase/tests/0008_reverse.sql`, `e2e/daybook.spec.ts`

**Interfaces:**
- `rpc_reverse_transaction(op, business, transaction_id, reason)`: original → `status='reversed'`, new `reversal` transaction with mirrored movements; receivable closed via negative allocation; `AZ_ALREADY_REVERSED` on repeat.
- `getDaybook({businessId, from, to, kinds, cursor, limit}): Promise<{rows, nextCursor}>` using keyset on `(business_date desc, created_at desc, id)`.

- [ ] **Step 1:** pgTAP scenario J.
- [ ] **Steps 2–5:** commit `feat: daybook and reversals`.

### Task 13: Dashboard summary

**Files:**
- Create: `supabase/migrations/20261116000900_rpc_dashboard.sql`, `src/features/dashboard/{HomeView,SummaryCard}.vue`
- Test: `supabase/tests/0009_dashboard.sql`, `src/features/dashboard/__tests__/HomeView.spec.ts`

**Interfaces:**
- `rpc_get_dashboard_summary(business, from, to) returns jsonb` → `{sales_minor, money_received_minor, operating_expenses_minor, stock_purchases_minor, net_cash_movement_minor, customer_debts_minor, accounts:[{id,name,type,balance_minor}]}`.

- [ ] **Step 1:** pgTAP: after A–H the summary equals: sales 200, money received 200 (100 + 60 + 40), operating expenses 25, stock purchases 80, customer debts 0; accounts sum = 100 + 60 + 40 − 25 − 80 + 200 − 30 = 265.
- [ ] **Steps 2–5:** commit `feat: dashboard summary`.

**Milestone 2 exit:** scenarios A–L pass in `supabase test db`; e2e add-sale, collection, daybook pass on mobile viewport.

---

## Milestone 3 — Offline and reports

### Task 14: Dexie queue and sync engine

**Files:**
- Create: `src/lib/offline/db.ts`, `src/lib/offline/queue.ts`, `src/lib/offline/sync.ts`, `src/stores/sync.ts`, `src/features/sync/SyncStatusView.vue`
- Test: `src/lib/offline/__tests__/queue.spec.ts` (fake-indexeddb), `src/lib/offline/__tests__/sync.spec.ts`

**Interfaces:**
- `enqueue(op: PendingOperation): Promise<void>`; `listPending(businessId)`; `syncAll(opts: {userId: string}): Promise<SyncReport>`; states `'saved_on_device' | 'syncing' | 'synced' | 'needs_attention'`.
- `createSale` / `createExpense` from Task 9 become: if `navigator.onLine` false or RPC network error → enqueue and return `{status:'saved_on_device', clientOperationId}`.

- [ ] **Step 1:** Tests: enqueue two ops, `syncAll` calls RPC in order, removes on success, keeps on network error with `attempts+1`, marks `needs_attention` on `AZ_*` error; replaying an op already acknowledged (server returns duplicate result) removes it; ops whose `user_id` ≠ current user are skipped and flagged (Review Focus 5).
- [ ] **Steps 2–5:** commit `feat: offline queue and sync`.

### Task 15: Offline e2e

**Files:** `e2e/offline.spec.ts`

- [ ] Use `context.setOffline(true)`, add a sale, assert "Saved on this device", `setOffline(false)`, click Sync, assert "Synced" and one Daybook row; reload and assert still one row.
- [ ] Commit `test: offline sale sync e2e`.

### Task 16: Reports and exports

**Files:**
- Create: `supabase/migrations/20261116001000_rpc_reports.sql`, `src/features/reports/{ReportsView,ReportTable,DateRangePicker}.vue`, `src/utils/csv.ts`
- Test: `supabase/tests/0010_reports.sql`, `src/utils/__tests__/csv.spec.ts`

**Interfaces:**
- RPCs: `rpc_report_sales`, `rpc_report_money_received`, `rpc_report_expenses`, `rpc_report_stock_purchases`, `rpc_report_account_statement`, `rpc_report_cash_movement`, `rpc_report_customer_debts` — all `(business, from, to, filters jsonb) returns jsonb`.
- `toCsv(rows: Record<string,unknown>[]): string` escapes quotes and prefixes `=`, `+`, `-`, `@` cells with `'` (formula injection).
- Print view via `@media print` stylesheet.

- [ ] **Step 1:** csv test: cell `=SUM(A1)` becomes `'=SUM(A1)`; pgTAP: cash movement report over A–H nets to 265 with transfers shown but not counted.
- [ ] **Steps 2–5:** commit `feat: reports and csv export`.

### Task 17: Business data export

- `rpc_export_business_data(business) returns jsonb` (owner only) → JSON download from Settings; audit event `export.created`.
- Commit `feat: business data export`.

**Milestone 3 exit:** offline e2e passes; exports reconcile with DB totals.

---

## Milestone 4 — Pilot readiness

### Task 18: Membership management
- `rpc_invite_member(business, email, role)`, `rpc_change_membership(business, membership_id, role|status)`; staff cannot set role `owner` (`AZ_FORBIDDEN`); UI `src/features/settings/MembersView.vue`; pgTAP privilege-escalation test.

### Task 19: Help, privacy, settings, French core screens
- `src/features/settings/{BusinessSettingsView,ProfileView,PrivacyView}.vue`, `src/features/help/HelpView.vue` with learning cards; `fr.json` for nav, auth, sale, expense, dashboard.

### Task 20: CI and docs
- `.github/workflows/ci.yml`: install, lint, type-check, unit, `supabase start` + `supabase test db`, build, Playwright (chromium).
- Docs from spec §15: `docs/PRODUCT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_DICTIONARY.md`, `docs/SECURITY.md`, `docs/OFFLINE_SYNC.md`, `docs/REPORT_DEFINITIONS.md`, `docs/TEST_REPORT.md`, `docs/DEPLOYMENT.md`, `docs/PILOT_GUIDE.md`, `docs/ROADMAP.md`, `docs/COMPETITOR_BENCHMARK.md`.

**Milestone 4 exit:** CI green; acceptance demonstration §16 recorded in `docs/TEST_REPORT.md`.
