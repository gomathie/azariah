---
name: vue-supabase-offline-pwa
description: Build or change a Vue 3 + TypeScript + Vite PWA backed by Supabase. Covers Postgres row-level security with explicit grants, tenant isolation, idempotent rpc_* writes, pgTAP tests, a Dexie offline queue, Vue I18n, Tailwind 4, Vitest and Playwright, money as integer minor units, consent-based support access, PDF and Excel exports, and Cloudflare Pages deployment. Reference implementation, Azaria, a small-business bookkeeping app. Use for screens, stores, migrations, RPC functions, policies, tests and reviews in this repository.
---

# Azaria — Vue + Supabase stack skill

Read `AGENTS.md`, `docs/architecture/ADR.md` and the task in
`docs/superpowers/plans/2026-11-16-azaria-mvp.md` before acting.

## Detection

`package.json` has `vue`, `@supabase/supabase-js`, `dexie`, `vue-i18n`; `supabase/config.toml`
exists; `src/features/<feature>/` folders; `src/lib/supabase/{client,rpc}.ts`.

## Layout

| Path | Holds |
|---|---|
| `src/features/<feature>/*View.vue` | Routed screens (one feature folder per nav area) |
| `src/features/<feature>/api.ts` | Thin typed wrappers around `callRpc` / selects for that feature |
| `src/components/ui/` | Shared primitives: `AppButton`, `AppInput`, `AppSelect`, `AppAlert`, `PageHeader`, `MoneyInput` |
| `src/stores/` | Pinia: `auth`, `business`, `catalog` (accounts/categories/contacts), `sync` |
| `src/lib/supabase/` | `client.ts` (singleton, publishable key only), `rpc.ts` (`callRpc`, `RpcError` with `AZ_*` codes) |
| `src/lib/offline/` | Dexie DB, `pending_operations` queue, `syncAll` |
| `src/utils/money.ts` | `parseMoney(text, minorUnit): bigint \| null`, `formatMoney(minor, currency, locale)` |
| `src/i18n/{en,fr}.json` | All user-facing copy. Keys: `nav.*`, `auth.*`, `sale.*`, `expense.*`, `dashboard.*`, `errors.AZ_*` |
| `supabase/migrations/` | Versioned SQL, `YYYYMMDDHHMMSS_name.sql`; check the directory for the next number |
| `supabase/tests/` | pgTAP SQL tests run by `npx supabase test db` |
| `e2e/` | Playwright specs against local Supabase |

## Conventions

- `<script setup lang="ts">`; Composition API only; props via `defineProps`, v-model via `defineModel`.
- Money is `bigint` minor units in SQL and TS. Never `number` arithmetic on amounts, never floats in SQL.
- Every financial write is an `rpc_<verb>_<noun>` Postgres function: `SECURITY DEFINER`,
  `SET search_path = public, pg_temp`, first line `perform assert_member(p_business_id, '{owner,manager,staff}')`,
  takes `p_client_operation_id uuid`, records it in `sync_operations` and returns the stored
  result on replay. Raise errors as `raise exception 'AZ_CODE'` using codes listed in `src/lib/supabase/rpc.ts`.
- Every business table: `business_id uuid not null references businesses(id)`, `alter table … enable row level security`,
  explicit `grant`, policy `using (is_member(business_id))`. No direct insert/update on financial tables.
- `transactions.business_date` is computed in the RPC from `occurred_at at time zone business.timezone`.
- Copy: plain words from the spec §3.4. No "ledger", "credit note", "accrual" in UI. Never show sales minus spending as "profit".
- Mobile first: 48px touch targets (`min-h-12`), bottom nav on mobile, side nav ≥ `md`. Visible focus. Labels on every input.

## Common tasks

**Add a screen:** create `src/features/<f>/<Name>View.vue` using `PageHeader` + ui primitives; add a
lazy route in `src/router/index.ts` under the AppShell children with `titleKey`; add copy to both
`en.json` and `fr.json`; add a Vitest spec for any logic and a Playwright spec for the journey.

**Add an RPC:** new migration `supabase/migrations/<ts>_rpc_<name>.sql`; follow the pattern in
`rpc_create_sale`; `revoke all on function … from public, anon; grant execute … to authenticated`;
pgTAP test in `supabase/tests/`; wrapper in the feature `api.ts`; regenerate types with
`npx supabase gen types typescript --local > src/types/database.ts`.

**Add a table:** migration with FK, checks, `(business_id, …)` index, RLS, grants, policies; pgTAP
asserts `relrowsecurity`; add to `docs/DATA_DICTIONARY.md`.

## Build for scale from the start

Azaria starts with a 15–30 business pilot but must grow to thousands of businesses and millions of
rows without a rewrite. Every change should respect these rules:

- **Queries are always tenant-scoped and indexed.** Filter by `business_id` first; add a composite
  index `(business_id, <sort or filter column>)` for any new access path. Check `explain analyze`
  on a table with 100k+ synthetic rows before merging a new report or list query.
- **Paginate every list.** Keyset pagination on `(business_date desc, created_at desc, id)` for the
  daybook and statements; never `offset` on large tables; cap page size at 100.
- **Aggregate in the database.** Dashboard and report totals come from `rpc_*` functions or
  indexed views, never from fetching rows and summing in the browser.
- **Keep RPCs short and atomic.** One transaction per business event; no loops over all rows of a
  business; no long-running work inside a request (queue it as a job later if needed).
- **Stateless frontend, thin client cache.** Dexie holds the pending queue and small read-model
  snapshots only; it is not a mirror of the database.
- **No per-tenant schemas or per-tenant infrastructure.** One schema, RLS isolation, `business_id`
  everywhere; horizontal growth comes from Supabase compute tiers, read replicas and indexes.
- **Measure, don't assume.** New performance-sensitive code ships with a note in
  `docs/ARCHITECTURE.md` (query plan or benchmark) and, where reasonable, a pgTAP or Vitest check
  that the index is used.
- **Lazy-load routes and heavy libraries**; keep the initial bundle under 150 kB gzipped so the app
  stays usable on low-end Android devices and slow networks.

## Documentation: where things are written down

Keep docs consistent with the code that actually exists (spec §15). Update in the same change:

| Doc | Update when |
|---|---|
| `AGENTS.md` → *Status checkpoint* | End of every work session: done, in progress, blockers, next action |
| `docs/architecture/ADR.md` | A design decision is made or changed (append an ADR; never silently edit a protected one) |
| `docs/ARCHITECTURE.md` | Stack, deployment, schema diagram, API/function boundaries change |
| `docs/DATA_DICTIONARY.md` | A table, column, enum or status transition is added or changed |
| `docs/SECURITY.md` | A policy, grant, role, storage rule or secret-handling step changes |
| `docs/OFFLINE_SYNC.md` | Queue, retry, conflict or sync-state behaviour changes |
| `docs/REPORT_DEFINITIONS.md` | A report formula, filter or date/currency rule changes |
| `docs/TEST_REPORT.md` | After each verification run: ID, steps, expected, actual, PASS/FAIL/BLOCKED, evidence path |
| `docs/DEPLOYMENT.md`, `docs/PILOT_GUIDE.md`, `docs/ROADMAP.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/COMPETITOR_BENCHMARK.md` | When the related process, scope or research changes |
| `docs/USER_GUIDE.md`, `docs/ADMIN_GUIDE.md` and their `.fr.md` copies | A screen, a button label or what a role may do changes. Keep the same `##` sections and block order in every language; `guide.spec.ts` fails otherwise. The app shows these files under Profile, Guides. |
| `src/i18n/en.json`, `fr.json`, `tw.json` | Any text on a screen changes. All three need the key. Twi is unreviewed machine translation; say so when adding to it. |
| `README.md` | Setup, env vars or commands change |
| `docs/superpowers/plans/*.md` | Tick the task checkbox when its verification passes |

Rules: plain language, present tense, no aspirational features described as done, no secrets,
date research claims, and prefer updating an existing doc over creating a new one.

### Project context (from the library's project-context-management workflow)

- **Entry point:** `AGENTS.md` is the context entry point (architecture, terminology, decisions,
  verified commands, status, known issues). `AGENTS.md` points every runtime at it. It is a
  navigation aid; the code and migrations are the truth when they disagree.
- **Session startup:** read `AGENTS.md` → ADRs → the plan task; run `git status` and `git log -5`;
  reconcile the status checkpoint with the actual code before doing anything.
- **Checkpoint (end of session):** replace the *Status checkpoint* in `AGENTS.md` with a few
  bullets: completed, in progress, blockers, next action. No transcripts.
- **Change rationale:** every guard, constraint, refusal or default gets a *why* comment at the
  code, a test named after the behaviour, and an entry in `docs/HANDOFF.md` using
  `Why / How / Benefit / Trade-off / Verification / Rollback`. If others will be tempted to undo
  it, add it to *Protected decisions* in `AGENTS.md`. Read all three before changing such code;
  disagreements go to the owner, never into a silent revert.
- Mark hypotheses as such; never claim the knowledge base guarantees memory across sessions.

### Changelog

`docs/CHANGELOG.md` is the single source of release notes (a "What's new" screen will read it
later, so keep the format strict):

- `## [Unreleased]` at the top; `## [x.y.z] - YYYY-MM-DD` per release.
- Categories as `### Added`, `### Changed`, `### Fixed`, `### Security`, `### Limitations`.
- One bullet per user-visible change, written for shop owners, not developers
  ("Record a sale while offline; it syncs when you reconnect"). Developer-only changes go in
  the commit message, not the changelog.
- Authoring notes go in HTML comments. Never keep a second copy of the notes anywhere.

### Documentation impact check (before saying a task is done)

1. Look at the real diff, not your memory of it.
2. Does it change setup/config/deps, user-visible behaviour, API or schema, deployment or
   migration steps, or architecture? For each "yes", update the doc from the table above and the
   changelog in the same change.
3. If nothing is affected, write one specific sentence saying why.
4. Verify commands and examples you touched; label anything you could not verify.
5. End your report with a short "Docs" line: files updated, categories unaffected and why.

## Support access (ADR-009)

- Platform admins are rows in `platform_admins`, added with SQL only. They see a shop directory, never books, unless the owner grants time-limited access.
- `is_member(business_id)` without roles is the read door, and it also admits support with a live grant. **A function or policy that writes must pass roles.** Add every new write to `supabase/tests/0016_support_access.test.sql`, which acts as support and expects a refusal.
- Client queries for "my shops" filter on the signed-in user's id. Never infer a person's role from a row that row security merely lets them read.
- The support view is `business.supportBusiness` with role `viewer`, held in memory. Hide write actions when the role is `viewer`; the database refuses them anyway.

## Reports and downloads

- A report RPC returns its total plus `lines` grouped in SQL. `src/features/reports/build.ts` turns the payload into columns, rows and a footer; it never computes a business figure the database did not return.
- Downloads are PDF (`pdf-lib`, loaded only on click) and Excel (`src/utils/xlsx.ts`, a dependency-free writer). PDF text goes through `pdfSafe`; amounts print as plain numbers with "Amounts in <code>" because the PDF font lacks some currency marks.
- Dates shown to people go through `friendlyDate` or `dateLocale` so English reads day first.

## Typed text is data

- Never build SQL from text. Functions take typed parameters; search text is escaped before `LIKE`.
- Never use `v-html` or `innerHTML`. Parse to data and render with elements, as the guide reader does.
- A new free-text column gets a line in a `clean_*` trigger, a length limit, and a hostile-input case in `supabase/tests/0017_text_safety.test.sql`.
- A value placed inside a PostgREST filter string is validated first with `src/utils/safe.ts`.
- Only `safeInternalPath` decides where to go after sign-in.
- Do not "sanitise" by deleting quotes or angle brackets. They are ordinary text; the defence is parameters and escaping.

## Traps this project has already paid for

- **A test that clicks by name can click the wrong page.** After a navigation click, wait for the destination's heading before choosing a link whose text also appears on the page you are leaving.
- **`npm run lint` rewrites files.** It runs with `--fix`. It once turned unicode escapes in a regex into raw characters and a spread into a typed array. Re-run the unit tests after linting, and avoid control-character regexes.
- **`npm run build` type-checks first.** A type error in a test file fails the deploy. Run `npx vue-tsc --build` before saying a change is done.
- **SQL tests share the local database.** They run inside a transaction but can see existing rows. Give fixtures names that cannot collide with demo data, and never assert a global row count.
- **The shell eats backslashes in generated SQL.** A psql `\gset` written through a shell script lost its backslash twice. Write SQL test files with the editor, not through `node -e` or `sed`.
- **A volatile function inside a `where` clause is not called once.** In a pgTAP assertion, call the function first, keep its result with `\gset`, then assert.
- **A YAML description with ": " in it must be quoted**, or the skill's frontmatter will not parse.
- **Local data survives `supabase migration up`, not `supabase db reset`.** Use `migration up` when someone is looking at the local app.
- **The Content Security Policy names the Supabase host.** Changing the project or adding a third-party script, font or API needs a matching edit in `public/_headers`.
- **The CLI targets the local stack by default.** A cloud push needs `--remote`, a dry run first, and the owner's go-ahead.

## Verify before claiming done

```
npm run lint && npm run type-check && npm run test:unit -- --run
npx supabase db reset && npx supabase test db     # local Docker only
npx playwright test --project=chromium            # needs dev server + local Supabase
npm run build
```

Report PASS / FAIL / BLOCKED per command. "Configured" is not "verified".

## Do not

- Put a service-role key anywhere in the client, `.env.example`, logs or tests.
- Run `supabase db reset --linked`, `db push` to a remote, or deploy without the owner's instruction.
- Add a second UI library, Options API components, or a React runtime.
- Store running balances in tables (ADR-003) or let the client pick `business_id` without server revalidation.
- Add attribution lines to commits.
