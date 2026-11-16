---
name: azaria-vue-supabase
description: Work in the Azaria bookkeeping PWA — Vue 3 + TypeScript + Vite, Pinia, Vue Router, Vue I18n, Tailwind 4, Dexie offline queue, Supabase (Postgres, Auth, RLS, rpc_* functions). Use for screens, stores, migrations, RPC functions, RLS policies, SQL/Vitest/Playwright tests and reviews in this repo.
---

# Azaria — Vue + Supabase stack skill

Read `CLAUDE.md`, `docs/architecture/ADR.md` and the task in
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
