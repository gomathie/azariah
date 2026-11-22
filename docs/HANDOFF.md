# Handoff log

Change-rationale entries for guards, constraints, refusals and defaults that a later agent might
be tempted to undo. Format: Why / How / Benefit / Trade-off / Verification / Rollback. Newest first.

## 2026-11-22 — Content Security Policy names the Supabase host

- **Why:** the spec asks for a CSP. A policy that allowed any host would not stop a injected script from sending shop data elsewhere.
- **How:** `public/_headers` limits scripts to the site and network calls to the site plus `zqxmlgeqvrmbczjsurtj.supabase.co` (https and wss).
- **Benefit:** injected code cannot load from, or post to, another origin. The app cannot be framed.
- **Trade-off:** changing the Supabase project, or adding any third-party script, font or API, needs a matching change in `public/_headers`. The symptom of forgetting is a blank or broken screen with a CSP error in the console.
- **Verification:** production build served locally with the policy on 2026-11-22; three screens, service worker and a Supabase sign-in call worked with no violation.
- **Rollback:** remove the `Content-Security-Policy` line from `public/_headers`.

## 2026-11-22 — `npm run build` was failing its type-check

- **Why:** three type errors (test `lib` setting, the i18n instance type, a report filter type) made `npm run build` exit non-zero. Cloudflare runs that command, so the first deploy would have failed.
- **How:** `tsconfig.vitest.json` lists `ES2022` and DOM libs; `createI18n` is typed as composition mode; the report filter is typed `Record<string, string>`.
- **Verification:** `vue-tsc --build` clean, `npm run build` exit 0, unit tests 31 passed.
- **Rollback:** n/a.

## 2026-11-22 — Local `.env` stays on the local stack after the cloud project was linked

- **Why:** the Playwright tests and manual dev sign-ups create throwaway users and shops. In the cloud project they would sit beside real traders' data.
- **How:** the cloud URL and publishable key live in `.env.production.local`, read only by `npm run build`. `.env` keeps the local values. The CLI needs `--remote` to touch the cloud database.
- **Benefit:** no test or dev session can write to the cloud project by accident.
- **Trade-off:** trying the app against the cloud database needs a production build, or a deliberate temporary env override.
- **Verification:** on 2026-11-22 an anonymous REST request to nine cloud tables, including `audit_events` and `documents`, returned 401 with code 42501. `migration list --remote` showed 15 of 15 matching.
- **Rollback:** copy the two values into `.env`. Not recommended while tests run from the same checkout.

## 2026-11-17 — An invoice or receipt is a paper, not a second sale

- **Why:** a trader needs a bill or a proof of money received they can hand over as a PDF. That paper must not add another sale or another payment.
- **How:** `rpc_issue_document` copies the amounts from an existing posted sale or collection, assigns INV- or RCT- numbers, and stores the paper. The PDF is built in the browser from that row. Reversing the entry marks its papers `void`.
- **Benefit:** Download PDF gives a file named like `INV-0001.pdf`. Tapping the button twice does not create a second number.
- **Trade-off:** a sale or expense saved offline has no PDF until it syncs. A receipt needs money received on that entry. Photos of paper receipts are still not in the app.
- **Verification:** `npx vitest run src/features/documents/__tests__/pdf.spec.ts` PASS, 3 tests. `npx supabase test db supabase/tests/0014_documents.test.sql` PASS, 18 tests. The migration is applied on the local database.
- **Rollback:** drop `rpc_issue_document`, `rpc_get_document`, `documents`, and `document_counters`, and remove the Add menu links.

## 2026-11-16 — Local Supabase ports sit above the Windows reserved range

- **Why:** Windows on this machine reserves TCP 54323–54422. Supabase's Studio, mail, and analytics ports are inside that range, so `supabase start` failed before the API came up.
- **How:** `supabase/config.toml` moves Studio to 54423, mail to 54424, the pooler to 54429, and analytics to 54427. Analytics stays off because the app does not use it. The start command excludes Studio, storage, realtime, and the other unused containers, and it is run as `node_modules\.bin\supabase.cmd` so npm does not eat `-x`.
- **Benefit:** the database, auth, and API start, and the SQL suite can run.
- **Trade-off:** a machine without that reserved range still uses the higher ports. Analytics logs are not collected locally.
- **Verification:** `supabase test db` PASS, 13 files, 134 tests.
- **Rollback:** put the ports back to 54323–54329 and set analytics `enabled = true`.

## 2026-11-16 — The app mark is the furnace tile

- **Why:** the name Azaria comes from Azariah in Daniel, who stood in the fire and was not burned. The owner chose the tile: a teal square, the letter A, and the flame in the opening.
- **How:** `BrandMark.vue` and `public/favicon.svg` use that drawing. The home-screen PNGs fill the square with the same teal so the phone mask does not leave empty corners.
- **Benefit:** the sign-in screen, the phone header, and the installed icon are the same mark.
- **Trade-off:** the other two furnace drawings (a plain A, and a rounded A) stay in `src/assets/brand/` and are not used on screen.
- **Verification:** looked at the welcome screen and the icon files in the browser. No automated test.
- **Rollback:** remove `BrandMark` from the auth layout, the side navigation, and the page header, and point the icon links back at a plain favicon.

## 2026-11-16 — A shop roster is a person plus a phone, admin or not

- **Why:** the people using Azaria are local traders and small informal shops. After creating an account they need to add who uses which phone, without role names like manager or viewer.
- **How:** `shop_people` stores the name, the phone, and the role. The role is `staff` or `manager`. Staff is the default. Only the owner can choose manager, which the screen calls Admin. A staff member cannot add people. Signing in is still `business_memberships`; the roster does not by itself create a login.
- **Benefit:** the setup screen is one form: person, phone, admin or not, then "Go to my shop".
- **Trade-off:** a helper listed here cannot open the app until they have their own sign-in. The screen does not pretend otherwise.
- **Verification:** `supabase/tests/0013_shop_people.test.sql` (not run).
- **Rollback:** drop `rpc_add_shop_person`, `rpc_list_shop_people`, and `shop_people`.

## 2026-11-16 — The last active owner cannot be removed or demoted

- **Why:** a business with no owner cannot invite a replacement or export its data.
- **How:** `rpc_change_membership` counts active owners and raises `AZ_FORBIDDEN` when the change would leave fewer than one. Only an owner may grant the owner role.
- **Benefit:** staff and managers cannot take ownership, and the shop cannot lock itself out.
- **Trade-off:** transferring ownership needs a second owner first.
- **Verification:** `supabase/tests/0012_membership.test.sql` (not run; the owner asked for the code before any test run).
- **Rollback:** drop `rpc_change_membership` and `rpc_invite_member`. Do not update `business_memberships` from the client.

## 2026-11-16 — A reversal keeps the original row and closes the remaining debt

- **Why:** the daybook must show that a mistake happened, and a credit sale that is undone must not leave the customer owing the money.
- **How:** `rpc_reverse_transaction` is owner/manager only. The original status becomes `reversed`. A new `reversal` transaction posts the opposite movements. Any remaining receivable is closed with a negative allocation and marked reversed, because `v_customer_balances` ignores reversed receivables.
- **Benefit:** cash returns to where it was, the debt drops, and the audit row `transaction.reversed` remains.
- **Trade-off:** staff who typed the entry cannot undo it themselves.
- **Verification:** `supabase/tests/0008_reverse.test.sql` (not run).
- **Rollback:** drop `rpc_reverse_transaction`. Do not delete the original transaction to "undo" it.

## 2026-11-16 — Customer payments settle the oldest debt first and are not sales

- **Why:** a shop owner who is paid later must see the debt fall and the cash rise, without the dashboard counting that money as another sale.
- **How:** `rpc_record_collection` writes a `collection` transaction and a positive money movement, then applies the amount to open receivables ordered by `created_at`, `id`. A payment above the outstanding debt raises `AZ_EXCEEDS_DEBT`.
- **Benefit:** scenario C stays true: money increases, debt decreases, sales total stays the same.
- **Trade-off:** the owner cannot choose which invoice a payment closes. The oldest open debt is always first.
- **Verification:** `supabase/tests/0006_collection.test.sql` (not run yet; the owner asked for the code before any test run).
- **Rollback:** drop `rpc_record_collection` and `rpc_get_customer_statement`. Do not record payments by inserting into `transactions` from the client.

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
