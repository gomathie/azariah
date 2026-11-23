# Azaria — agent instructions and project context

Single source of truth for every agent runtime (Claude Code, Codex, Cursor, Cline, Windsurf). `CLAUDE.md` only imports this file.

Read this first, then the shared workflow library at
`C:\Users\gomat\OneDrive\Documents\Workflow and skills\AGENT-INSTRUCTIONS.md`
(path varies per machine; the folder name is constant). Project files win over library defaults.

## What this is

Azaria (formerly "Steady Book") is an independent, mobile-first bookkeeping PWA for small businesses in
Africa. Spec: `Azaria_Master_Development_Prompt.md`. Decisions: `docs/architecture/ADR.md`.
Plan: `docs/superpowers/plans/2026-11-16-azaria-mvp.md`. It is **not** part of DEKA ERP.

## Stack

Vue 3 + TypeScript + Vite (scaffolded with create-vue), Pinia, Vue Router, Vue I18n, Tailwind CSS 4
(`@tailwindcss/vite`), Dexie (offline queue), `@supabase/supabase-js`, Zod, vite-plugin-pwa.
Tests: Vitest (jsdom), Playwright, Supabase SQL tests (`supabase/tests`). Backend: Supabase
(Postgres + Auth + RLS + RPC functions). Local stack via `npx supabase` with Docker.

## Commands (verified on Windows, PowerShell or Git Bash)

- `npm install` — install
- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run test:unit` — Vitest
- `npm run type-check`, `npm run lint`, `npm run build`
- `npx playwright test` — e2e (needs `npx playwright install chromium` once and a running local Supabase)
- `npx supabase start` / `npx supabase stop` — local Supabase (Docker)
- `npx supabase db reset` — **local only**; applies `supabase/migrations` and `seed.sql`
- `npx supabase test db` — run SQL tests in `supabase/tests`
- `npx supabase gen types typescript --local > src/types/database.ts` — regenerate DB types

## Conventions

- Money: `bigint` minor units in DB and `bigint` in TS; format only in UI (`src/utils/money.ts`).
- All financial writes go through `rpc_*` Postgres functions with `p_client_operation_id` (idempotent).
- Every business table: `business_id uuid`, RLS on, explicit grants; `auto_expose_new_tables = false`.
- Vue: `<script setup lang="ts">`, feature folders under `src/features/<feature>/`, shared UI in
  `src/components/ui/`, stores in `src/stores/`. Customer-facing copy lives in `src/i18n/*.json`
  (plain words: "Add sale", "Money received", "Customer owes"; never "credit note" or "ledger posting").
- Never show "Sales − Spending = Profit".
- Scalable by default: tenant-scoped indexed queries, keyset pagination, aggregation in the database,
  short atomic RPCs, lazy-loaded routes. See "Build for scale" in the project skill.
- Documentation lives in `docs/` per spec §15; update the matching doc in the same change (see the
  "Documentation" table in the project skill).

## Protected decisions

See `docs/architecture/ADR.md`. Do not undo without the owner's agreement: minor-unit money (ADR-001),
RPC-only mutations (ADR-002), derived balances (ADR-003), RLS + explicit grants (ADR-004).
Support access follows ADR-011 (it replaced the consent and read-only rules of ADR-009 on 2026-11-23): an admin opens a shop before reading or writing it, every opening is audited, rights per admin are set only by a superadmin, a new admin function names the right it needs, nobody signs in as another person, and the shop list must ask only for the signed-in person's own memberships.
Azaria Plus is never granted by the browser (ADR-010): only `billing_apply_payment`, called by the service role after Paystack's verify call, marks a payment paid; payments are off for every shop until a platform admin turns them on; prices and discounts are set in the database; discount codes stay unlisted.

## Status checkpoint

- 2026-11-22: Tasks 1–18 keep their passing checks. SQL suite: 17 files, 236 tests, PASS. Unit: 15 files, 67 tests, PASS. Lint and type-check PASS. `npm run build` PASS.
- Done on 2026-11-22, checked in a browser but with no spec file yet: Home redesign (money available, quick actions, recent entries), daybook with direction and day groups, Add menu with payment, transfer and owner money, customer add and edit, account menu, reports with breakdowns and PDF or Excel downloads, consent-based support access (ADR-009) with a console at `/support`.
- Cloud: Supabase project `azaria` (ref `zqxmlgeqvrmbczjsurtj`, London) has migrations up to `20261116001500`. Migrations `20261122000100` (report breakdowns) and `20261122000200` (support access) are local only. The app tolerates their absence: reports show totals without lines and nobody is a platform admin. Push them only with a dry run and the owner's go-ahead.
- Deploy: the owner is connecting Cloudflare Pages. Settings are in `docs/DEPLOYMENT.md`, headers in `public/_headers`, variables in section 2 of the gitignored `.env` (one env file since 2026-11-23; `.env.example` is its sample and also lists the Paystack function secrets).
- Local logins, local stack only: shop owner `demo@azaria.test`, support `support@azaria.test` and, since 2026-11-23, `smooth@admin.local` (the same address as the cloud platform admin). Passwords were given to the owner in chat and are not in the repository.
- Blockers: Windows reserves TCP 54323–54422, so local Supabase uses 54423, 54424 and 54427 for Studio, mail and analytics. Analytics is off. Start the stack with the project binary, not `npx supabase start -x`, because npm swallows `-x`. Use `npx supabase migration up` to apply a new migration without wiping local data.
- Later on 2026-11-22: in-app user and admin guides from `docs/USER_GUIDE.md` and `docs/ADMIN_GUIDE.md` (with `.fr.md` copies), Twi as a third language (unreviewed machine translation), and an injection-safety pass (`src/utils/safe.ts`, migration `20261122000300`, `docs/SECURITY.md` "Typed text is data"). SQL suite now 17 files, 236 tests. Unit 15 files, 67 tests. The first platform admin exists on the cloud database.
- Also on 2026-11-22: guide reader rebuilt for navigation (phone accordion with a sticky jump list and search; desktop side contents with the current section marked); public About page from `docs/ABOUT.md`; two ad videos with voice-over in `marketing/` (English and Twi), source in `marketing/ad-video`. Unit tests now 70.
- 2026-11-23: short "brag" ad cuts added under `marketing/` (Remotion and Hyperframes; pushed). Phone walk-through of every screen at 360 and 393 pixels wide found no layout or console problems; four small text links were given a taller tap area. A plan for a paid upgrade, Azaria Plus (easy mode for people with little schooling, paid through Paystack), is in `docs/superpowers/plans/2026-11-23-azaria-plus-easy-mode-paystack.md`.
- Later on 2026-11-23: phases 1 and 2 of that plan are built, plus discount codes (ADR-010). Migration `20261123000100_billing.sql` (local only), Edge Functions `billing-checkout`, `billing-verify` and `paystack-webhook` in `supabase/functions/` (not deployed), upgrade screen at `/settings/plus`, discount codes tab in the support console. SQL suite: 18 files, 291 tests, PASS. Unit: 17 files, 86 tests, PASS. Lint, type-check and build PASS. Not done: a payment against Paystack (no account or key yet), a Playwright spec, real prices (seeded GHS 30, 80, 300 are placeholders), and the Plus features themselves (phases 3 to 5), so the upgrade screen sells nothing yet. The owner has not answered the plan's section 2 decisions; the recommendations were assumed.
- Cloud check on 2026-11-23 (supersedes the "local only" notes above): a dry run of `db push` found the cloud database up to date with all 19 migrations, through `20261123000100_billing`. The site is deployed on Cloudflare Pages from `main`. Of the three billing functions only `paystack-webhook` is deployed; `billing-checkout` and `billing-verify` are not, and `PAYSTACK_SECRET_KEY` and `APP_URL` are not set, so nobody can pay yet.
- Domain: the site is served at `https://azariabooks.com` (use it as `APP_URL`); `www.azariabooks.com` does not answer. On 2026-11-23 the live build held no Supabase address, so the Cloudflare production variables were probably not set at build time.
- Also on 2026-11-23: "salon" added as a kind of shop with its own starting categories. Migration `20261123000200_salon_business_type.sql` is local only (not on the cloud database), so the live site must not be redeployed with this option before it is pushed. SQL suite: 18 files, 296 tests, PASS. Unit: 17 files, 86 tests, PASS. Lint and type-check PASS.
- Later on 2026-11-23: one switch for all payments, off by default (ADR-010). Migration `20261123000300_billing_switch.sql` (local only): while off, nobody can start a trial or a payment and every shop counts as having Plus; a platform admin turns it on and edits plan prices in the new Payments tab of the support console. SQL suite: 18 files, 314 tests, PASS. Unit: 17 files, 86 tests, PASS. Lint, type-check and build PASS; phone-size browser run 7 of 7. Local-only migrations now: `20261123000200` (salon) and `20261123000300` (switch); push both before the site is redeployed from a commit that holds them.
- End of 2026-11-23: admin rights (ADR-011), accounts list, per-shop payments switch, Admin console redesign and Sentry error tracking (off until `VITE_SENTRY_DSN` is set). A dry run late on 2026-11-23 showed the cloud database has every migration up to `20261123000600`; only `20261123000700_admin_overview.sql` is missing there, so the live Admin console's Overview shows an error until it is pushed (owner's go-ahead needed). The live site at `azariabooks.com` now carries its Supabase address. Sentry: no DSN yet; the token in `~/.sentryclirc` cannot read project keys. SQL suite: 18 files, 359 tests, PASS. Unit: 18 files, 90 tests, PASS. Lint, type-check and build PASS. Phone and computer browser run 14 of 14. Not done: two-step sign-in for admins, a Playwright spec.
- Next: turn the 2026-11-22 browser checks into Playwright specs. Task 19 still has no automated check. Task 20, the CI workflow, has not been run. Owner commits and pushes; agents do not.

## Rules for every runtime

1. Spec wins: `Azaria_Master_Development_Prompt.md`. ADRs in `docs/architecture/ADR.md` are protected.
2. Work from `docs/superpowers/plans/2026-11-16-azaria-mvp.md`. The **Where we are** table is the position marker: do the row marked **You are here**, then update that table and this checkpoint.
3. Load the project skill `.claude/skills/vue-supabase-offline-pwa/SKILL.md` for how to add a screen, an RPC, a migration, a test, and how to verify before claiming done.
4. Tests before claims: run the relevant check and report PASS/FAIL/BLOCKED honestly.
5. No secrets in the repo. No destructive commands against remote Supabase projects.
6. Do not commit, push, deploy or create cloud resources unless the owner asks. The owner makes the commits.
7. Commit messages (when asked): plain conventional commits (`feat:`, `fix:`, `docs:`, `test:`). No attribution lines.
8. Update the status checkpoint below at the end of a work session; log change rationale in `docs/HANDOFF.md`.

## Do not

- Commit real keys. `.env` is gitignored; `.env.example` has placeholders only.
- Run `supabase db reset --linked` or any destructive command against a remote project.
- Point `.env`, `npm run dev` or any test at the cloud project. Tests create throwaway users and shops.
- Run `supabase db push --remote` without a dry run and the owner's go-ahead.
- Push, deploy or create cloud resources without the owner's explicit instruction.
