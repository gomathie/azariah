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

## Status checkpoint

- 2026-11-16: Tasks 1–18 have passing checks. SQL suite: 13 files, 134 tests, PASS. Playwright onboarding, sale, collection, daybook, and offline passed on chromium and mobile. MoneyInput, Home, offline queue, sync, and CSV unit tests passed.
- In progress: Task 19 is still the position marker. Invoices and receipt PDFs are written. PDF unit test PASS (3). SQL `0014_documents` PASS (18). Migration `20261116001500` is applied locally.
- Blockers: Windows reserves TCP 54323–54422, so local Supabase uses 54423, 54424, and 54427 for Studio, mail, and analytics. Analytics is off. Start the stack with the project binary, not `npx supabase start -x`, because npm swallows `-x`.
- Cloud: Supabase project `azaria` (ref `zqxmlgeqvrmbczjsurtj`, London) was created and linked on 2026-11-22. All 15 migrations are applied there. `.env` stays local; cloud values are in the gitignored `.env.production.local`. See `docs/DEPLOYMENT.md`. No frontend is deployed; the owner is connecting Cloudflare Pages (settings in `docs/DEPLOYMENT.md`, headers in `public/_headers`, variables in gitignored `.env.cloudflare`). `npm run build` now passes its type-check. A local demo login exists on the local stack only: `demo@azaria.test`.
- 2026-11-22 UI: Customers screen has an Add customer form; a round profile button sits top right in `PageHeader`; Add to home screen is a row in Settings only. Checked in Chromium on a phone viewport; no e2e spec covers them yet. `npm run lint` fails on 8 mock-typing errors in test files and on generated `dev-dist/`.
- Next: Task 19 has no automated check yet. Task 20 is the CI workflow, not run. Owner commits and pushes; agents do not.

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
