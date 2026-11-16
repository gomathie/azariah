# Azaria — project context for agents

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

## Protected decisions

See `docs/architecture/ADR.md`. Do not undo without the owner's agreement: minor-unit money (ADR-001),
RPC-only mutations (ADR-002), derived balances (ADR-003), RLS + explicit grants (ADR-004).

## Status checkpoint

- 2026-11-16: repo created, spec renamed to Azaria, ADRs + plan written, Vue scaffold + deps,
  Supabase local config. Next: Task 1 (config) → Task 2 (schema migration).

## Do not

- Commit real keys. `.env` is gitignored; `.env.example` has placeholders only.
- Run `supabase db reset --linked` or any destructive command against a remote project.
- Push, deploy or create cloud resources without the owner's explicit instruction.
