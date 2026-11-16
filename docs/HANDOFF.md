# Handoff log

Change-rationale entries for guards, constraints, refusals and defaults that a later agent might
be tempted to undo. Format: Why / How / Benefit / Trade-off / Verification / Rollback. Newest first.

## 2026-11-16 — Local Auth redirects point at the Vite app

- **Why:** sign-up and password reset send `emailRedirectTo` to the page origin (`/login`, `/reset-password`). GoTrue rejects a redirect that is not `site_url` or in `additional_redirect_urls`. The scaffold value was port 3000, so the app on port 5173 could not create a session.
- **How:** `supabase/config.toml` `site_url` is `http://localhost:5173`, and the allow list includes localhost and 127.0.0.1 on 5173 and 4173 for those two paths.
- **Benefit:** local sign-up returns a session and Playwright can finish onboarding.
- **Trade-off:** a restart of the local stack is required after changing this file. Production must set its own site URL; this value is for the local stack only.
- **Verification:** `npx playwright test onboarding --project=chromium`.
- **Rollback:** restore the previous `site_url` only if the local app moves off port 5173, and update the allow list to match.
Protected decisions are listed in `AGENTS.md`; design context is in `docs/architecture/ADR.md`.

## 2026-11-16 — `auto_expose_new_tables = false` and explicit grants

- **Why:** Supabase's cloud default exposes every new public table to `anon` and `authenticated`.
  A forgotten grant would leak a tenant's data.
- **How:** `supabase/config.toml` sets `auto_expose_new_tables = false`; `20261116000200_rls.sql`
  revokes everything from `anon` and grants per table.
- **Benefit:** a new table is invisible until someone writes its policy and grant deliberately.
- **Trade-off:** forgetting a grant shows up as "permission denied" in the app instead of a leak.
- **Verification:** `supabase/tests/0001_schema.test.sql` ("anon has no grants", "every table has RLS");
  `0003_rls.test.sql` cross-business reads and forged inserts.
- **Rollback:** not recommended; if needed, remove the config line and add grants per table.

## 2026-11-16 — Financial tables are not writable through the API

- **Why:** a sale with payment and debt is several rows that must commit together (spec §5.3).
- **How:** no insert/update grants on `transactions`, `money_movements`, `receivables`,
  `credit_allocations`; writes go through `rpc_*` functions with `assert_member` and
  `p_client_operation_id` idempotency.
- **Benefit:** atomic, idempotent, auditable; offline replays cannot double-post.
- **Trade-off:** every new financial operation needs a migration and a pgTAP test.
- **Verification:** `0003_rls.test.sql` ("cannot insert into transactions directly");
  `0004_sale.test.sql` scenario I (replay).
- **Rollback:** none planned; see ADR-002.

## 2026-11-16 — Test helpers use `reset role`, not `set role postgres`

- **Why:** Postgres refuses to change `role` inside a `security definer` function, and
  `authenticated` cannot `set role postgres`.
- **How:** `tests.clear_auth()` is a plain function that runs `execute 'reset role'`.
- **Benefit:** tests can switch between users and back to the superuser in one transaction.
- **Trade-off:** helper block is inlined in each test file (pg_prove runs files independently);
  canonical copy in `supabase/tests/_helpers.inc`.
- **Verification:** `npx supabase test db` passes.
- **Rollback:** n/a.
