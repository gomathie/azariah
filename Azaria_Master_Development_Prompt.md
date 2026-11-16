# AZARIA — MASTER DEVELOPMENT PROMPT

**Product:** Azaria  
**Tagline:** *Record Today. Grow Tomorrow.*  
**Document type:** Build specification and execution instructions for an AI coding agent  
**Version:** 1.1 · 16 November 2026 (renamed from Steady Book to Azaria)  
**Primary audience:** Small-business owners and entrepreneurs in Africa, including participants in Academy for Creating Enterprises (ACE)  
**Technology:** Vue 3 + TypeScript + Vite, Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions), Tailwind CSS, Pinia, Vue Router, IndexedDB/Dexie, PWA  
**Project boundary:** **Azaria is a completely independent application. It is NOT part of DEKA ERP and must not depend on its code, database, authentication, APIs, tenants, modules, or deployment.**

---

## 0. YOUR MANDATE

Act as a cross-functional product and engineering team: principal SaaS architect, Vue/TypeScript engineer, Supabase/PostgreSQL architect, security engineer, bookkeeping domain specialist, UX researcher for low-connectivity African markets, accessibility specialist, QA/test engineer, DevOps engineer, and technical writer.

**Build a working, production-quality, mobile-first web application called Azaria** that enables people with limited accounting knowledge to record daily sales and expenses, see cash and mobile-money balances, track who owes them money, and understand the performance of their business.

Do not deliver only a plan, a static mockup, or a collection of disconnected UI pages. Build the application iteratively, provide migrations and tests, verify the financial calculations, and leave a deployable, documented project. Implement an end-to-end MVP before optional advanced features.

**Non-negotiable product principles:**

1. **Simple before sophisticated:** A user can create a business and record a first sale with very little setup. Everyday actions should be understandable without accounting training.
2. **Correct before attractive:** Financial amounts, outstanding debts, and balances must be accurate; no misleading “profit” metric.
3. **Mobile first and low data:** Works on affordable Android devices, small screens, intermittent networks, and modest data plans.
4. **Offline-capable but honest about risk:** Explicitly distinguish data saved on a device from data safely synchronized to Supabase.
5. **Business data privacy:** Every business's data is isolated. Mentors and ACE administrators do not automatically get access to entrepreneurs' private finances.
6. **Separate from DEKA ERP:** Independent repository, credentials, Supabase project, infrastructure, and brand.
7. **Inclusive:** Welcome all entrepreneurs; any ACE-related educational content should be optional and not require any religious affiliation.
8. **Incremental:** Prioritize a dependable daybook MVP, then add supplier debts, stock, invoicing, coaching, and advanced analysis based on pilot evidence.

### Required working method

- Inspect the existing repository if one is supplied. If it is empty, scaffold a new application. Preserve existing working code, data, and configurations if present.
- Research the current official documentation for all selected technologies. Verify package and API compatibility before installation.
- Establish a compact architecture decision record (ADR) and implementation checklist, then **continue building** rather than stopping after the research step.
- Make sensible, documented assumptions when a choice is not supplied; seek authorization only for real blockers or impactful external actions (production changes, real paid services, irreversible deletion, live customer communications).
- At the end of each milestone, run the available tests, report PASS/FAIL/BLOCKED, identify changed files, and commit in logical changes if repository access permits.
- Never claim a database migration, UI test, integration, performance result, or deployment succeeded unless it was actually executed and verified.
- Do not create fake customer transactions in any real production environment.

---

## 1. PRODUCT GOALS AND USER RESEARCH

### 1.1 Mission

Help entrepreneurs answer five questions every day:

1. How much did I sell?
2. How much money did I actually receive and spend?
3. How much cash or mobile money is available now?
4. Who owes my business money, and how much?
5. Is my business improving, and what is driving the change?

### 1.2 Primary personas

- **Micro-retailer / market trader:** Sells many small items, sometimes records only one daily sales total, uses cash and mobile money.
- **Food seller / caterer:** Records daily sales, ingredients, packaging, transport, and event orders.
- **Service provider / artisan:** Records jobs, customer payments, advances, materials, and business expenses.
- **Small-business owner with staff:** Delegates entry while retaining control over corrections, exports, and business settings.
- **ACE entrepreneur / mentor:** Uses reports and optional learning guidance to strengthen recordkeeping habits; mentoring access requires explicit consent.

### 1.3 Competitor benchmarking (document findings with sources)

Compare at least: Khatabook (customer ledger), Wave (small-business bookkeeping), Akaunting (simple accounting), Zoho Books (invoicing and reports), and ERPNext (advanced accounting and inventory). If relevant, examine credible African SME-focused bookkeeping products.

For each competitor evaluate: setup friction, add-sale speed, expense capture, payment methods, credit/customer balances, mobile experience, offline behavior (verify; do not assume), receipts, reporting, usability, pricing, and limits. Produce a feature matrix with **Adopt / Adapt / Defer / Avoid** recommendations. Do not copy another company's branding or proprietary UI.

### 1.4 Pilot discovery

Prepare a lightweight interview/test guide for 15–30 entrepreneurs across retail, food, and services. Include users with differing digital literacy and device/network conditions. Capture: what they currently record, use of paper notebooks, customer debts, cash/MoMo handling, main pain points, and concepts they misunderstand (profit vs money remaining). Do not make user research a hard prerequisite to building the core MVP; flag assumptions to validate in the pilot.

### 1.5 Initial geography and languages

- Start with **Ghana** as a pilot-friendly default, but keep country and currency configurable.
- Support **English** at launch and **French** in the architecture and core flows; complete French translations before an advertised bilingual release.
- Seed selectable ISO currency codes for GHS, ZMW, CDF, XOF, NGN, KES and other needed currencies, without hardcoding currency formats or tax rules.
- Store timestamps in UTC, render them in the business's chosen timezone, and use a business-local date for daily totals.
- Support country-specific payment method labels (cash, mobile money, bank, other) without assuming one payment provider is universal.
- Do not implement tax compliance claims without jurisdiction-specific research and review.

---

## 2. PRODUCT SCOPE AND RELEASE PLAN

### 2.1 P0 — Minimum viable product (build this fully)

1. Responsive installable PWA shell, branding, accessible navigation, loading/empty/error states.
2. Supabase Auth (secure registration/login, password reset or supported passwordless sign-in, email verification, session handling).
3. Create a business: name, business type, country, timezone, base currency; create first user as **Business Owner** automatically.
4. Business switching for users with authorized memberships; no cross-business data leakage.
5. Default account setup: Cash, Mobile Money, and optional Bank; editable names; opening balances handled as money movements, **not revenue**.
6. Default editable transaction categories for sales, purchases for resale, and operating expenses; suggest categories by business type.
7. Fast **Add Sale**: date/time, amount, optional description/category/customer, amount received, receiving account, balance on credit, optional note. Offer a quick amount-only route.
8. Fast **Add Expense**: amount, category, pay-from account, date/time, description, optional attachment. Separate stock purchases from operating expenses.
9. **Daybook**: chronological history with filters, running account balances where applicable, transaction details, corrections/reversals and audit history.
10. **Customer credit book**: contacts, amounts owed, due dates, partial collections, payment history and customer statements.
11. **Money accounts**: cash, MoMo, bank; inflows/outflows; transfers between own accounts (not income or expense).
12. **Dashboard**: today's sales, receipts, operating spending, stock purchases, total customer debts, account balances, recent transactions, and clear sync status.
13. Reports: daily/weekly/monthly daybook; sales; collections; spending by category; customer debts; cash movement; balance by account; CSV and print-friendly/PDF output as appropriate.
14. Offline entry of supported simple transactions with IndexedDB queue, safe retry/idempotency, manual resync option, and clear statuses.
15. Basic owner/staff access model, membership-checked operations, comprehensive RLS and protected storage.
16. Automatic and user-initiated safe data export; explicit backup/restore strategy.
17. English UI with internationalization framework; locale-aware dates, amounts and symbols.
18. Unit, integration, RLS, financial-invariant, offline and end-to-end tests; staged deployment and user documentation.

### 2.2 P1 — High-value enhancements (after MVP validation)

- Supplier debt book, partial supplier payments, supplier statements.
- Product catalog, basic inventory quantities, stock in/out, opening stock, low-stock notifications.
- Cost-of-goods-sold support and **estimated profit** only when cost inputs and valuation rules are sufficiently reliable.
- Receipts and simple invoices with numbering, status and PDFs; business details and logo.
- Receipt photo upload to private Supabase Storage with upload size/content restrictions.
- Owner contributions, owner withdrawals and separate business/personal money reminders.
- Staff role customization, user invitations, activity logs, cashier-specific permissions.
- Saved categories and saved transactions, recurring expense reminders, optional export to accountant.
- Full French translations and usability review.
- Guided checklists, goal tracking, consent-based mentor summaries.

### 2.3 P2 — Consider only with evidence of demand

- Multiple branches, advanced stock valuation and product profitability.
- Multi-currency **transactions** and exchange-rate accounting (do not confuse this with simply choosing a business base currency).
- Payment-provider integrations, bank feeds, automatic reconciliation.
- Advanced invoicing, tax localizations, full double-entry bookkeeping, payroll.
- AI insights and OCR receipt capture with safeguards and user review.
- Automated WhatsApp/SMS notifications with consent, compliance, and messaging costs.
- Cooperative/group features or program-level analytics only with privacy-aware aggregation and explicit permission.

For each deferred item include a dependency, acceptance criteria, and an explicit non-goal for the MVP. Never quietly present a P1/P2 feature as complete.

---

## 3. UX AND INFORMATION ARCHITECTURE

### 3.1 Navigation

Mobile bottom navigation proposal: **Home · Daybook · Add (+) · Customers · Reports**. Put Accounts, Business Settings, Profile, Sync and Help in an accessible overflow/settings menu. On desktop use a simple side navigation. Avoid nesting frequent workflows inside advanced menus.

### 3.2 Onboarding

1. Welcome / language choice.
2. Sign up or log in with secure Supabase Auth.
3. Business name, business type, country and currency. Default timezone from country only as a suggestion and allow correction.
4. Automatically create business, owner membership, default categories and Cash/MoMo account. Ensure provisioning is atomic and idempotent.
5. Offer a friendly guided first sale/expense. Do not require tax number, chart of accounts, bank connection, employee data, or product catalog.
6. Optional invitation to staff later.

Target: first business setup under 3 minutes; most new users should record a sale in under 20 seconds after onboarding. Measure rather than assume.

### 3.3 Essential screens to implement and test

- Welcome, auth, password recovery and verification
- Create business, business switcher and settings
- Home dashboard with a clear business/date context
- Quick add sale / expense, each with expandable advanced options
- Daybook list and detail; filtering and correction flow
- Cash, Mobile Money and Bank account list and account statement
- Money transfer between accounts
- Customer contact, customer debt detail, record payment and statement
- Reports explorer, filter controls, export view
- Sync status screen showing pending, failed and successfully synced items
- Membership/staff management for owner
- Help and financial-term explanations
- Privacy, data export and account lifecycle controls
- Loading, offline, unauthorized, empty-data and failure states

### 3.4 Copywriting / terminology

Favor: “Add sale”, “Money received”, “Expense”, “Bought stock”, “Customer owes”, “Record payment”, “Money moved”, “Money available”. Avoid defaulting to “credit note”, “accrual”, “contra account” or “ledger posting” in customer-facing copy. Technical ledger terminology may still appear in developer docs.

For every screen provide: fields, validation, default values, field help, error messages, confirmation behavior, empty state, mobile layout, keyboard navigation and accessibility label.

### 3.5 Accessibility and low-connectivity UX

- Target WCAG 2.2 AA practices; visible focus, keyboard support, sufficient contrast and understandable errors.
- Minimum practical touch-target sizes; work well on narrow Android phones.
- Format money without rounding away stored cents; support non-Latin locale formatting if needed later.
- Avoid heavy UI/chart bundles on initial load; lazy-load optional routes.
- Reduce data transfer, compression of images, caching of static app assets, clearly show offline state.
- Ensure a session can recover gracefully from network interruptions.

---

## 4. ACCOUNTING DOMAIN RULES — HIGHEST PRIORITY

Azaria is a **daybook**, not initially a full general-ledger ERP. Nevertheless, its records must be internally consistent and auditable.

### 4.1 Distinguish these events

- **Sale:** Revenue/event value recognized by the simplified daybook. May be paid, partially paid or fully on credit.
- **Sales receipt / customer collection:** Money actually received. A collection of an older credit sale **must not create another sale**.
- **Operating expense:** Expense paid or owed (for MVP, clearly specify if only paid expenses are supported).
- **Stock purchase:** Cash outflow and inventory acquisition; not automatically the same as cost of goods sold or operating profit.
- **Money transfer:** Movement between owned cash/MoMo/bank accounts; neither income nor expense.
- **Owner contribution:** Money injected into business; not revenue.
- **Owner withdrawal:** Money taken out by owner; not a business expense in profit calculations.
- **Opening balance:** Initial money/account state, not a new sale.
- **Refund/return/reversal:** Adjusts the relevant source transaction and money/debt state without removing history.
- **Supplier payment:** Settles payable, not a second purchase, once P1 payables exist.

### 4.2 Calculation invariants

For a simple sale of 100 with 60 received and 40 due:

- Sales recorded = 100.
- Cash/MoMo inflow = 60 in the specified receiving account.
- New customer outstanding = 40.
- Later collection of 40 increases account balance by 40 and reduces debt by 40; **sales remains 100**.

More invariants:

- Account-to-account transfer of 50: source decreases 50, destination increases 50, net business cash change is zero.
- If owner contributes 100, money increases by 100 but sales and profit do not.
- If owner withdraws 30, money decreases by 30 but the withdrawal is not categorized as operating expense.
- Payment allocation cannot exceed the remaining customer debt unless explicitly handled as a customer advance/overpayment.
- Replaying the same offline request must not duplicate any sale or money movement.
- All writes that affect a sale and its receipt/debt must commit or fail together.
- Financial history must remain explainable after corrections, refunds, and reversals.

### 4.3 Profit and cash clarity

**Never display `Sales – All Spending = Profit` as an unconditional truth.** Stock still on hand, sales on credit, owner transactions, unpaid bills and cost of goods sold affect the interpretation.

MVP dashboard terminology:

- **Sales:** Value of sales recorded in the date range.
- **Money received:** Cash/MoMo/bank collected in the date range (distinguish receipts from older sales when useful).
- **Operating expenses paid:** Paid day-to-day business expenses.
- **Stock purchases paid:** Purchases for resale, shown separately.
- **Net cash movement:** Actual money inflows minus outflows for selected account(s), including defined owner movements and transfers consistently.
- **Customer debts:** Unpaid amount linked to credit sales (net of allocations and adjustments).

Do not show estimated profit until there is an agreed cost model and sufficient data. If a later estimate is offered, label its basis and limitations explicitly and test inventory/COGS treatment.

### 4.4 Monetary precision and time

- Use PostgreSQL `bigint` minor units or a well-defined `numeric` strategy with strict conversion and display tests. Avoid binary floating-point for accounting values.
- Store ISO currency code with business and monetary records; track precision per currency.
- Initially define one base currency per business. Do not silently allow multi-currency posting without conversion rules.
- Store `occurred_at` and `created_at` distinctly; date-range reports use the business-local business date.
- Maintain soft-void/reversal relationships rather than silently deleting posted history.
- For edited draft transactions, define which fields may change; posted corrections must leave an audit trail.

---

## 5. TECHNICAL ARCHITECTURE — VUE + SUPABASE

### 5.1 Approved stack

| Layer | Preferred choice | Responsibility |
|---|---|---|
| UI | Vue 3 + TypeScript + Vite | Mobile-first application |
| Styling | Tailwind CSS and accessible Vue primitives | Clean, responsive UI |
| Routing | Vue Router | Auth/role-aware routes |
| Local state | Pinia | UI and selected business state |
| Internationalization | Vue I18n | English/French messages |
| Backend-as-a-service | Supabase | Managed core services |
| Database | Supabase PostgreSQL | Canonical business records |
| Identity | Supabase Auth | Registration, sessions, recovery |
| Authorization | RLS + grants + server-side checks | Business-level data isolation |
| Server logic | PostgreSQL functions and Supabase Edge Functions | Atomic financial workflows and integrations |
| Attachments | Private Supabase Storage | Receipts and document files |
| Offline queue | IndexedDB via Dexie | Local unsynced entries |
| PWA | Vite PWA plugin (verify current compatibility) | Installability and offline app shell |
| Unit tests | Vitest | Domain and UI logic |
| E2E tests | Playwright | Browser journeys and offline behavior |
| Database tests | Supabase CLI SQL/pgTAP tests where suitable | Policies, constraints, transaction invariants |
| Hosting | Suitable static hosting, optionally Cloudflare | Deploy Vue build only; Supabase is the backend |
| CI/CD | GitHub Actions or equivalent | Lint, types, tests, migrations, deploy gates |

Use current stable compatible releases. Lock dependencies and record versions. Do not add Laravel, Filament, Cloudflare D1, or DEKA ERP as an application dependency.

### 5.2 Repository structure (adapt to existing code)

```text
azaria/
  src/
    app/                  # app bootstrap and layouts
    assets/
    components/
    composables/
    features/
      auth/
      onboarding/
      dashboard/
      daybook/
      sales/
      expenses/
      customers/
      accounts/
      reports/
      settings/
      sync/
    i18n/
    lib/supabase/
    router/
    stores/
    types/
    utils/
  public/
  supabase/
    config.toml
    migrations/
    functions/
    tests/
    seed.sql              # synthetic local/test records only
  tests/
    unit/
    integration/
    e2e/
  docs/
    product/
    architecture/
    security/
    operations/
    user-guide/
  .env.example
  package.json
  README.md
```

### 5.3 API and transaction boundary

Direct Supabase client reads are acceptable **only where RLS and grants have been audited**. Complex mutations (sale with payment/debt, transfer, collection, reversal, membership provisioning) must be executed through controlled PostgreSQL functions/RPC or authenticated Edge Functions that validate ownership, business membership, amounts and idempotency. **Never rely on multiple independent browser writes for one business transaction.**

Decide transaction boundaries up front. Use PostgreSQL constraints, unique client operation identifiers and appropriate row locking or concurrency controls. All financial mutations must succeed/fail atomically.

### 5.4 Supabase credentials and secrets

- In the browser, use only Supabase's public/publishable client key appropriate to the SDK and project configuration.
- **Never** place a service role/secret key in frontend code, public environment variables, client logs, IndexedDB, or downloadable source maps.
- For elevated server functions, hold secrets only in Supabase-managed server secrets and restrict permissions.
- Validate caller authorization inside functions; do not assume possession of a public key is authorization.
- Use HTTPS, appropriate Content Security Policy, secure redirect rules, and session lifecycle handling.

---

## 6. POSTGRESQL DATA MODEL AND TENANT ISOLATION

Design migrations with clear keys, foreign keys, check constraints, uniqueness, and indexes. Proposed logical model (modify with ADR if a better normalization is demonstrated):

| Entity/table | Essential role |
|---|---|
| `profiles` | Non-sensitive user profile linked to `auth.users` |
| `businesses` | Business settings, owner-created profile, country, timezone, base currency |
| `business_memberships` | User-business association, role and membership status |
| `money_accounts` | Business cash, MoMo, bank accounts and currency |
| `categories` | Business-scoped income/sale, operating expense, stock purchase groupings |
| `contacts` | Customers (and supplier type later) |
| `transactions` or `business_documents` | Immutable/controlled source business events, type, date, amount, status, reference |
| `transaction_items` | Optional itemization; do not force product creation in MVP |
| `money_movements` | Account-linked inflows/outflows and movement references |
| `receivables` or `credit_obligations` | Sale-linked obligations and due dates |
| `credit_allocations` | Collections allocated to debts, partial allocations |
| `audit_events` | Actor, business, operation, before/after metadata as appropriate |
| `sync_operations` | `(business_id, client_operation_id)` unique replay keys and outcome |
| `attachments` | Metadata for private receipt objects |
| `business_preferences` | Locale, reminders, configurable defaults |
| `products`, `stock_movements` | P1, if inventory activated |
| `mentor_invites` / `mentor_grants` | P1 opt-in, time-scoped reporting access |

**Do not implement competing mutable sources of truth for balances.** Prefer authoritative movements and allocations; if storing balance aggregates for performance, define transactional consistency rules and reconciliation tests.

Every business-owned row must be unambiguously tenant-scoped. Choose consistent `business_id` type (UUID) and index heavily used queries, typically `(business_id, occurred_at)` or `(business_id, status)`.

### 6.1 Membership and roles

Proposed roles:

- **Owner:** Full authority for that business; invitations, access, settings, data export.
- **Manager:** Manage operational entries and approved staff tasks; configurable restrictions.
- **Staff/Cashier:** Create authorized transactions, see only permitted reports, cannot manage ownership.
- **Viewer:** Read approved business reports, no financial mutation.
- **Mentor (P1):** Explicitly granted, limited read access to selected reports; no operational editing.
- **Platform support:** Operates administrative systems; does not automatically bypass business-level privacy.

A user may belong to multiple businesses. The currently selected business ID from the client is **never trusted by itself**; revalidate membership on every query and mutation. A staff user must not be able to promote themselves to Owner.

### 6.2 RLS, grants and views — required tests

- Enable RLS on every exposed business-owned table.
- Explicitly configure SQL grants and policies; do not assume turning on RLS is sufficient.
- Scope policies to `auth.uid()` **and** approved business membership with appropriate role and status.
- Prevent insert/update where the caller forges a different `business_id`.
- Protect personal data and cross-business user/contact discovery.
- Do not expose private audit/admin tables or privileged helper functions through unrestricted Data API access.
- Check policy recursion and misuse of `SECURITY DEFINER` functions; pin safe `search_path`, restrict execution, and review ownership of privileged functions.
- Ensure exposed views respect underlying table RLS (e.g. use `security_invoker` where supported) or keep them in unexposed schemas.
- Secure storage buckets using `storage.objects` RLS; make receipts private and issue short-lived authorized URLs where needed.
- Test anonymous, unauthorized, member, staff, owner, removed member, suspended business and cross-business access scenarios.

### 6.3 Migrations and existing data

Use versioned SQL migrations with Supabase CLI. Keep schema/type generation reproducible. `supabase db reset` is appropriate **only for disposable local databases**; never run destructive resets against production. If prior app data exists, preserve it, inspect it, migrate additively, and verify balances and membership rules.

---

## 7. BACKEND WORKFLOWS AND CONTRACTS

Define typed request/response schemas, errors, authorization, idempotency and transaction rules for at least:

1. `create_business_and_owner`
2. `create_sale`
3. `record_expense`
4. `record_stock_purchase`
5. `record_customer_collection`
6. `transfer_between_accounts`
7. `record_opening_balance`
8. `reverse_transaction` / `correct_transaction`
9. `invite_business_member` / `change_membership`
10. `get_dashboard_summary`
11. `get_daybook` with cursor/pagination and filtering
12. `get_customer_statement`
13. `get_cash_movement_report`
14. `export_business_data`
15. `sync_pending_operations`

For every operation specify:

- Caller role, business scope and security checks
- Data shape and validation
- Server-generated IDs/references
- Database records produced
- Atomicity/idempotency strategy
- Normal and error responses
- Audit event
- Example tests, including concurrency and replay

Use Zod or suitable shared schemas with server-side enforcement. Keep application errors non-sensitive and localizable. Avoid broad permissions from a generic `update(any_table)` endpoint.

---

## 8. OFFLINE-FIRST STRATEGY

### 8.1 Required behavior

- Cache the app shell and static assets for offline launch after initial online use.
- Store pending **supported** entry types locally in IndexedDB with stable UUID operation IDs and schema versions.
- Display one of: **Saved on this device · Syncing · Synced · Needs attention**.
- Use an ordered, retryable queue with exponential backoff, explicit retry button and helpful conflict messages.
- On reconnection and valid authentication, send operations to a server endpoint that validates membership, checks `(business_id, client_operation_id)` uniqueness, commits atomically and returns the authoritative result.
- Preserve local pending records until the server acknowledges durable commit. Never discard unresolved operations merely because one request fails.
- Reconcile local optimistic totals with authoritative server totals after sync; visually distinguish pending amounts in reports.
- Prevent double posting when requests time out and get retried.
- Define behavior if a user changes business, is removed from a business, signs out, or session expires while operations are pending.
- Warn that locally unsynced data may be lost if browser storage is cleared, the device is lost, or the application is removed.

### 8.2 Scope restrictions

For MVP, support offline creation of simple sales and expenses first. Add offline partial collections and transfers only after conflict/invariant tests pass. Do not assume service workers can always run background sync reliably across mobile browsers. Provide foreground sync on app open, reconnect, and user action.

### 8.3 Offline test matrix

Test: airplane mode; interrupted API call; browser reload; device restart; repeated retries; simultaneous tabs; changed user session; removed membership; duplicate operation; stale account balance; queued reversal; storage quota exceeded; storage cleanup; schema upgrade; and intermittent mobile connection. Document supported and unsupported behavior honestly.

---

## 9. REPORTS AND ANALYTICS

### MVP catalog

1. **Daily Daybook:** chronological business events with status and references.
2. **Sales Summary:** gross sales value by day/week/month and category.
3. **Money Received:** customer collections (from current and prior sales) by account.
4. **Operating Expenses:** paid operational expenses by category and period.
5. **Stock Purchases Paid:** separately tracked purchases for resale.
6. **Money Account Statement:** cash/MoMo/bank opening balance, in/out and closing balance.
7. **Cash Movement:** reconciled inflows and outflows with transfers identified, not double-counted.
8. **Customer Debts:** opening receivable, new credit, collections, reversals, closing outstanding and overdue amounts.
9. **Monthly Business Snapshot:** understandable period comparisons, top expense categories and financial-habit tips.
10. **Recordkeeping Consistency:** days with entries and missing-day reminders, without making moral judgments about users.

Features: date filter, selected business, category/account filter, totals, explanatory labels, print-friendly PDF and CSV; optional spreadsheet export later. A report must use server-authorized data, not trust client-calculated totals. Exports must be scoped and permission-checked like normal views.

**Do not invent gross/net profit** when cost and inventory data are missing; instead explain what is known and how to improve records.

---

## 10. LEARNING AND ACE MENTORING

Treat mentoring as a differentiator, not as a surveillance mechanism.

### Core educational help

Provide short optional tooltips/learning cards covering: separating business/personal money, recording every sale, stock purchase vs everyday expense, customer debts, cash flow vs profit, how to reconcile cash/MoMo, and why a consistent daybook helps decisions.

### Mentor access (P1)

- Entrepreneurs explicitly invite a mentor and choose what reports are shared.
- Mentors cannot view raw records, contacts, payroll-like data or attachments unless separately, specifically authorized.
- Grants are scoped, revocable, auditable and time-limited where appropriate.
- No ACE organizer, church leader or program admin has automatic financial access due to group affiliation.
- Program-level analysis should use opt-in, appropriately aggregated indicators and avoid identifying an individual business without permission.
- Avoid faith-based assumptions in onboarding and product access. Keep optional ACE-facing training content respectful and inclusive.

### WhatsApp-friendly communication

Provide optional **copy/share reminder** and WhatsApp deep link for a customer debt reminder initiated by the user. Do not automatically message customers, expose contact lists, or integrate a paid messaging provider without consent and authorization.

---

## 11. SECURITY, PRIVACY AND RELIABILITY

Security requirements:

- Supabase Auth with verified sessions, recovery, abuse/rate limits, safe redirect settings, and secure token handling.
- RLS and SQL grants on all exposed tables; storage RLS on private buckets.
- Server-side validation, tenant-scoped reads/writes, explicit privileged workflows.
- No secret/service-role key in client.
- Audit log for created, edited, reversed, exported and permission-changing actions.
- Privacy notices, appropriate retention, data portability, account deletion/archival policy and contact/data export.
- Minimal PII; never infer or record religion from ACE participation without a specific legitimate need and consent.
- Safe attachment MIME/size rules, malware risks assessment, authorized access, controlled retention.
- Secure production observability without logging customer names, full transaction descriptions, secrets or personal finance data indiscriminately.
- DDoS/abuse controls, rate limits where needed, security headers, dependency updates and secret rotation.
- Backup policy: verify Supabase's current backup/PITR features and plan limits; schedule independent exports as appropriate and practice restoring a staging copy.
- Formal financial invariants and disaster-recovery testing, not only UI snapshots.

Privacy/legal: research Ghana Data Protection Act and applicable requirements for any markets launched. Avoid presenting the app as a regulated bank, tax filing system, or professionally certified accounting service without evidence.

---

## 12. QUALITY ASSURANCE — NON-NEGOTIABLE TESTS

### 12.1 Domain tests with known expected values

**A. Paid sale:** GHS 100 sale fully paid in cash → sales +100, cash +100, debts 0.

**B. Credit sale:** GHS 100 sale, GHS 60 paid via MoMo → sales +100, MoMo +60, receivable +40.

**C. Subsequent credit collection:** GHS 40 paid later → receivable 0, money +40, **no new sale**.

**D. Operating expense:** GHS 25 rent/transport from cash → cash −25, operating spending +25.

**E. Stock purchase:** GHS 80 goods bought for resale → cash −80, stock-purchase metric +80, do not assert profit falls by 80.

**F. Transfer:** GHS 50 Cash → MoMo → Cash −50, MoMo +50, net business money unchanged.

**G. Owner capital:** GHS 200 added → balance +200, sales unchanged.

**H. Owner withdrawal:** GHS 30 removed → balance −30, operating expenses unchanged.

**I. Idempotency:** Replay any of A–H with the same client operation ID → no duplicate records or balances.

**J. Correction:** Reverse an incorrectly entered sale and verify the money and customer debt are corrected with full audit trail.

**K. Date boundaries:** Transactions just before/after midnight use the business timezone in daily reports.

**L. Cross-business isolation:** Business A member cannot see, edit, export, delete, or attach files to Business B records, even with guessed IDs and forged API calls.

### 12.2 Engineering tests

- Authentication and password recovery flows
- First-owner creation and repeat onboarding requests
- Role assignment and privilege escalation denial
- Invalid monetary amounts and currency precision
- Partial customer payments and overpayment rejection/handling
- Concurrent writes and transaction rollback
- RLS policy tests for each exposed table and private storage bucket
- Export authorization, print/PDF accuracy and formula injection safeguards for CSV
- Offline retries, reconciliation and session changes
- Full mobile E2E tests for dashboard, add sale/expense, collections and reports
- Accessibility checks and meaningful keyboard/screen-reader tests
- Migration tests and restore exercises
- Load and cost tests of representative business transaction volumes

Use synthetic fixtures only unless explicitly authorized for customer data. Maintain a TEST EVIDENCE table with ID, steps, expected, actual, PASS/FAIL/BLOCKED, environment, and evidence link/path. Do not claim 100% passing tests if tests were not run.

---

## 13. DEPLOYMENT, OPERATIONS AND COST CONTROL

### Environments

Establish local, staging and production with **separate Supabase projects/databases** for staging and production. Configure per-environment frontend URLs, authentication redirects, secrets, storage buckets and monitoring. Never reuse live user data in staging without appropriate controls/anonymization.

### CI/CD

1. Install and lock dependencies; lint/format/type-check.
2. Run unit, database/RLS, integration and E2E test suites in safe environments.
3. Verify migration ordering and generated types.
4. Preview/deploy frontend to staging; apply staging migrations with controlled procedure.
5. Perform staging smoke tests, including sale→payment→report.
6. Use an explicit production deployment gate and backups/migration verification.
7. Monitor errors and document rollback/forward-repair options.

**Never run `supabase db reset --remote` or any destructive reset against production.** Verify the target project before applying any remote migration.

### Operating cost and scalability

Research current Supabase Auth/DB/Storage/Edge Functions quotas, plan costs, backups and limits using official documentation. Estimate costs for pilot (15–30 businesses), early growth (hundreds) and expansion (thousands) using explicit assumptions about monthly transactions, files and active users. Do not fabricate flat-rate capacity guarantees. Add indexes and paginate histories; assess RLS query plans and dashboard aggregation performance before scaling.

### Monitoring and support

Maintain a lightweight platform health dashboard for authentication errors, failed syncs, pending operations, function failures, storage failures and latency (without exposing business-finance content). Include support runbooks for lost login access, queued offline data, data export, duplicate reports, currency mistakes, and user/member removal.

---

## 14. DELIVERY PHASES AND EXIT CRITERIA

### Milestone 0 — Discovery and architecture (short, do not stall)

**Produce:** competitor matrix, product scope, assumptions, ADRs, entity-relationship design, security model, flow diagrams and prioritized issue list.

**Exit:** implementation can proceed with no contradictory accounting definitions or unclear tenant boundary.

### Milestone 1 — Foundation

**Build:** Vue app, design system, i18n shell, Supabase local setup, schema migrations, Auth, protected routes, business provisioning, owner membership, RLS policies, seed/test fixtures.

**Exit:** new user can sign up, create a business and log in; business isolation tests pass.

### Milestone 2 — Daily business records

**Build:** Cash/MoMo/bank accounts, categories, sales, expense/stock purchase, transfer, customer credit, collection, daybook, corrections, dashboard.

**Exit:** domain scenarios A–L pass; no double counting; mobile workflow usable.

### Milestone 3 — Offline and reports

**Build:** installable PWA, IndexedDB queue, sync, conflict/error screens, standard reports, CSV/print/PDF, business export.

**Exit:** tests pass for intermittent connectivity and repeated requests; exports reconcile with records and honor permissions.

### Milestone 4 — Pilot readiness

**Build:** production hardening, privacy/help content, French translation of core screens if in scope, monitoring, restore/runbooks, onboarding improvements.

**Exit:** staging pass, accessibility review, security sign-off, known limitations and pilot guide; production deploy only when authorized.

### Milestone 5 — Pilot feedback and expansion

**Produce:** 15–30 participant usability protocol, issue prioritization, improvements to core workflows. Implement selected P1 features **only after** feedback or clear product requirements.

### Product targets to measure (proposed, not promises)

- First setup: under 3 minutes.
- Record a sale or expense: under 20 seconds for returning users.
- First-entry success without assistance: target ≥90% in a representative pilot.
- Duplicates caused by retries: zero in tested scenarios.
- Cross-business data exposure: zero in security tests.
- Critical money-calculation errors: zero in release tests.
- Supported offline sync scenarios: all pass in documented test suite.

---

## 15. REQUIRED DELIVERABLES

Your final repository and handover must include:

1. **Working application:** Vue source, Supabase backend definitions/functions, complete P0 screens, responsive UI.
2. **`README.md`:** purpose, prerequisites, local setup, environment variables, run/tests/build instructions.
3. **`docs/PRODUCT_REQUIREMENTS.md`:** personas, flows, acceptance criteria, MVP boundaries.
4. **`docs/COMPETITOR_BENCHMARK.md`:** research comparison with source links and date checked.
5. **`docs/ARCHITECTURE.md`:** stack, deployment diagram, DB schema, API/function boundaries, ADRs.
6. **`docs/DATA_DICTIONARY.md`:** tables, fields, status transitions, currencies, financial definitions.
7. **`docs/SECURITY.md`:** threat model, memberships, SQL grants/RLS, storage, incident response.
8. **`docs/OFFLINE_SYNC.md`:** local queue, conflicts, retry strategy, user-visible states, limitations.
9. **`docs/REPORT_DEFINITIONS.md`:** formulas, filters, currency/date treatment, reconciliation tests.
10. **`docs/TEST_REPORT.md`:** actually executed tests, evidence, defects and limitations.
11. **`docs/DEPLOYMENT.md`:** Supabase configuration, migrations, secrets, CI/CD, release and rollback procedure.
12. **`docs/PILOT_GUIDE.md`:** participant onboarding, basic user guide, mentor consent, feedback questionnaire.
13. **`docs/ROADMAP.md`:** P0, P1, P2 completed/deferred with dependencies.
14. **`.env.example`:** placeholders only, never real secrets.
15. **Migration and test files:** reproducible SQL schema, RLS, seed fixtures and automated tests.

Keep documentation consistent with the **actual implemented** application, not aspirational features.

---

## 16. NON-NEGOTIABLE ACCEPTANCE DEMONSTRATION

Use a **disposable test business** to show this exact end-to-end journey:

1. Sign up and create “Ama's Provision Shop” with GHS currency.
2. Create the first business Owner automatically.
3. Record a GHS 100 sale, GHS 60 received through MoMo, GHS 40 on credit to a named test customer.
4. Open customer debts and verify GHS 40 outstanding.
5. Record GHS 40 paid later into Cash and verify debt becomes zero **without increasing sales**.
6. Record GHS 25 operating expense and GHS 80 stock purchase separately.
7. Transfer GHS 20 between money accounts without recording income or expense.
8. View the daybook, filtered customer statement, sales report and account balances; verify all expected totals.
9. Disconnect network, create an allowed offline transaction, show **Saved on this device**, reconnect and synchronize once.
10. Re-submit the same operation identifier; verify it was not duplicated.
11. Create a second test business and prove users cannot access each other's records, exports or receipt files.
12. Export a report and verify the values match canonical database records.
13. Show mobile and desktop layouts and demonstrate accessible error handling.
14. Show test results, RLS policies, migration history, backup/restore approach and known limitations.

**Done means these workflows are working and tested, not merely drawn in a prototype.**

---

## 17. OFFICIAL REFERENCE STARTING POINTS

Use these as starting points and verify updated instructions, API names, compatibility and plan limits at implementation time:

- Supabase Vue quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/vue
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase RLS (including grants and secure views): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Securing Edge Functions: https://supabase.com/docs/guides/functions/auth
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase local development and CLI: https://supabase.com/docs/guides/local-development
- Supabase CLI migration workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase database: https://supabase.com/docs/guides/database/overview
- Vue: https://vuejs.org/guide/introduction.html
- Vite: https://vite.dev/guide/
- Pinia: https://pinia.vuejs.org/
- Vue Router: https://router.vuejs.org/
- Vue I18n: https://vue-i18n.intlify.dev/
- Tailwind CSS: https://tailwindcss.com/docs/installation/
- Dexie: https://dexie.org/
- Playwright: https://playwright.dev/docs/intro
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

Competitor research: use official current product documentation where possible and cite each comparison claim. Document unknowns rather than guessing.

---

## 18. START WORK NOW

**First action:** inspect the repository and installed tools/skills. If no application exists, initialize the standalone Azaria project and configure Supabase local development. Identify and document the few essential architectural decisions, then proceed to implement P0 milestones in order.

**First checkpoint:** show the data model, RLS strategy, transaction semantics, onboarding flow, and the planned first vertical slice: **create business → record sale → record customer collection → view daybook and accurate balances**.

**Then build that vertical slice**, run tests, report observed results, and continue through the rest of the MVP. Do not defer all implementation while preparing documents. Do not deploy to production or use real customers without authorization.

**Final definition of success:** Azaria is a working, simple, independent and secure Vue + Supabase PWA that an African small-business owner can use to record daily transactions, track cash/mobile money and customer credit, and generate trustworthy business summaries—even when internet access is unreliable.
