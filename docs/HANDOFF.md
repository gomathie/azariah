# Handoff log

Change-rationale entries for guards, constraints, refusals and defaults that a later agent might
be tempted to undo. Format: Why / How / Benefit / Trade-off / Verification / Rollback. Newest first.

## 2026-11-23 — Only the server can turn Azaria Plus on; discount codes are never listed

- **Why:** the owner asked for Paystack payments, then discount codes that a super admin gives out as a percentage, for a period or for ever. A payment system that trusts the browser, the return address or an unsigned webhook can be made to give Plus for nothing.
- **How:** `20261123000100_billing.sql` and three Edge Functions (ADR-010). The owner opens a payment with `rpc_billing_start_payment`; the price and discount are set there. `billing_apply_payment` is granted to the service role alone and is called only after Paystack's verify call. The webhook checks the signature before parsing. Discount codes have no grants; `billing_find_discount` gives one answer for every kind of bad code. A 100% code skips Paystack and is applied inside the same owner-only function.
- **Benefit:** a forged webhook, a changed amount, a replayed event and a made-up return address all do nothing. Support can give a shop a discount but cannot touch its books or grant Plus by hand.
- **Trade-off:** no automatic renewal; the owner pays again each period. Refunds do not shorten Plus. Discount guesses are not rate limited. Prices are changed with SQL. The owner's reading of "for a period or for ever" was taken to mean how long the code works; if it should mean how long a shop keeps the discount after first using it, the code table needs a per-shop redemption row.
- **Verification:** `0018_billing.test.sql` (53), two added refusals in `0016_support_access.test.sql`, `paystack.spec.ts` and `billing.spec.ts` (16), a local run of the functions with a dummy key, and a phone-size browser run. No payment has been made against Paystack, test or live.
- **Rollback:** remove the Settings link and the two routes; the tables can stay empty.

## 2026-11-22 — Text is cleaned in triggers as well as in the browser

- **Why:** the owner asked that all input be safe from injection and stored as text. The browser can be bypassed with a forged request, so the database must clean too.
- **How:** `20261122000300_text_safety.sql` adds `clean_text` and a BEFORE trigger on each table with free text. It removes control, zero-width and direction-override characters and nothing a person can see. It adds a phone format check and length limits, as NOT VALID so existing rows are untouched. In the browser, `callRpc` runs `cleanPayload` on every write.
- **Benefit:** the same rule holds for the app, a forged request and the SQL console. Quotes, angle brackets and equals signs are left alone, because the defence against injection is parameters and escaping, not deleting characters.
- **Trade-off:** a legitimate zero-width joiner in a name would be removed. A new free-text column needs its own trigger line.
- **Verification:** `0017_text_safety.test.sql`, 26 assertions; `safe.spec.ts`, 9 tests; browser run with a hostile customer name.
- **Rollback:** drop the triggers and constraints in a new migration.

## 2026-11-22 — The guides are Markdown files in docs/, read by the app

- **Why:** the owner asked for a user guide and an admin guide inside the app. The shared library's convention is one guide file per audience with a translated copy that has the same headings.
- **How:** `docs/USER_GUIDE.md`, `docs/ADMIN_GUIDE.md` and their `.fr.md` copies are imported as raw text and parsed by `src/features/guide/markdown.ts` into plain data. No HTML from a file reaches the page.
- **Benefit:** one copy of each guide, readable on GitHub and in the app, available offline after first use.
- **Trade-off:** the parser supports headings, paragraphs, lists, simple tables and bold only.
- **Verification:** `guide.spec.ts` checks that each French copy has the same sections and block types as the English one, and that each guide names the features it must cover.
- **Rollback:** remove the route and the Profile links.

## 2026-11-22 — Twi was translated by an AI and needs a native speaker

- **Why:** the owner asked for Twi. No native speaker reviewed it.
- **How:** `src/i18n/tw.json` has every key. Dates and numbers in Twi use Ghana's English formats because browsers have none for Twi. The guides fall back to English with a note.
- **Trade-off:** some words may read unnaturally or be wrong. Product terms such as Mobile Money, PDF, Excel and invoice are left as traders say them.
- **Verification:** key-completeness check; Home rendered in Twi in a browser.
- **Rollback:** remove `tw` from `SUPPORTED_LOCALES`.

## 2026-11-22 — `is_member` has a read-only door for support, and writes must name roles

- **Why:** the owner asked for super-admin provisions. The spec forbids automatic access to an entrepreneur's finances, so support access is by the owner's consent, time-limited and read-only (ADR-009).
- **How:** `is_member(business_id)` also returns true for a platform admin with a live grant, but only when called without roles. All 16 places that call it without roles are reads. Every write passes roles.
- **Benefit:** support can see what the owner sees without a second set of read functions, and cannot write by construction.
- **Trade-off:** a future write that calls `is_member` or `assert_member` without roles would open to support. `0016_support_access.test.sql` tries a sale, a reversal, owner money, an export, a customer insert and a shop rename as support and expects each to be refused. Add the new write to that test.
- **Verification:** SQL suite PASS, 16 files, 210 tests. Browser run: no access before the grant, read-only view with a banner after it, "You do not have permission" on a sale, access gone after the owner stopped it, an ordinary owner sent away from `/support`.
- **Rollback:** re-create `is_member` from `20261116000200_rls.sql` in a new migration and drop the two tables.

## 2026-11-22 — The shop list asks only for the signed-in person's own memberships

- **Why:** found while testing support access. Row security lets a support person with a live grant read a shop's membership rows. The app listed every membership row it could read, so it showed that shop as the support person's own, with the owner's role. The database still refused writes; the screen was wrong.
- **How:** `useBusinessStore.load()` filters `user_id = <signed-in user>`, and returns no shops when nobody is signed in.
- **Benefit:** a person's role always comes from their own membership.
- **Trade-off:** none known.
- **Verification:** two new unit tests in `src/stores/__tests__/business.spec.ts`; browser run shows no Add or Edit buttons in the support view.
- **Rollback:** do not remove the filter while ADR-009 stands.

## 2026-11-22 — Excel files are written by hand, with no spreadsheet library

- **Why:** the owner asked for PDF or Excel instead of CSV. Spreadsheet libraries are several hundred kilobytes; phones on slow networks pay for that.
- **How:** `src/utils/xlsx.ts` writes the six XML parts of a workbook into an uncompressed ZIP (about 200 lines). Text is stored as inline strings.
- **Benefit:** no new dependency, no formula injection, numbers stay numbers.
- **Trade-off:** one sheet, two fonts, two number formats. Anything richer needs a library.
- **Verification:** Excel 16 opened two downloaded files, read the right rows, and reported the total cell as a number in bold. 9 unit tests.
- **Rollback:** delete the file and the Excel button.

## 2026-11-22 — Daybook rows read movements with the entry, one request per page

- **Why:** the daybook must show money in and money out, the customer and the account.
- **How:** `getDaybook` embeds `contact` and `money_movements(money_account)` in the same keyset-paged select, capped at 100 rows.
- **Benefit:** one round trip per page, no per-row requests.
- **Trade-off:** each row carries its movements (one or two).
- **Verification:** browser run on the demo shop; `e2e/daybook.spec.ts` and `e2e/collection.spec.ts` pass.
- **Rollback:** remove the embedded fields; `EntryRow` then shows the plain amount.

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
- **How:** `.env` keeps the local values. The cloud URL and publishable key are set as Cloudflare Pages variables (a commented copy sits in `.env`). On 2026-11-23 `.env.cloudflare` and `.env.production.local` were merged into `.env`, so a local `npm run build` now also targets the local stack. The CLI needs `--remote` to touch the cloud database.
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

## 2026-11-23: admin rights, accounts, per-shop payments, admin console, Sentry

- **What:** migrations `20261123000400` to `000700`. Admins open any shop without the owner's consent; rights per admin set by a superadmin; a list of created accounts; a payments switch per shop; an overview. The support console became the Admin console (`SupportConsoleView.vue` is the shell, one panel file per section). Sentry error tracking behind `VITE_SENTRY_DSN`.
- **Why:** the owner will employ a support team and wants them able to see and fix any shop, with himself deciding who may do what (ADR-011, replacing part of ADR-009).
- **How:** `is_member` passes role checks for an admin who has the shop open for changes and holds `edit_shops`. Existing admin functions got their right by swapping one line in place with `pg_get_functiondef` inside the migration.
- **Watch:** an admin working in a shop is not a member, so a function that looks up the caller's own membership row would find none. The sale, reversal and billing paths are tested; others are not.
- **Not done:** two-step sign-in for admins; a Playwright spec; the owner's Sentry DSN.

## 2026-11-23: sign in first, confirm the email later

- **What:** migration `20261123000800_email_confirmation.sql` (table `email_confirmations`, function `rpc_email_confirmation`), `src/features/auth/emailConfirm.ts`, `EmailConfirmReminder.vue` shown from `AppShell.vue`, a code in `supabase/templates/magic_link.html`. Sign-up now says so when the email already has an account.
- **Why:** two people registered on the live site on 2026-11-23, confirmed their email and never got in. The owner chose to let people in first and remind them afterwards; the reminder must never block.
- **How:** with "Confirm email" off Supabase marks every address confirmed, so the app keeps its own record. The code is sent with `signInWithOtp` (never creates an account) and checked with `verifyOtp`; the new session's signed `amr` claim is the proof the database accepts. "Later" hides the reminder for three days per person on that phone.
- **Trade-off:** unconfirmed and mistyped addresses can use the app; see `docs/SECURITY.md`. The code email counts against the sender's hourly limit.
- **Watch:** do not let the browser tell the database an email is confirmed. Do not turn the reminder into a block without the owner.
- **Verification:** `0019_email_confirmation.test.sql` 11 of 11; `emailConfirm.spec.ts` 5 tests; phone-size browser run on the local stack 11 of 11 real checks (the send request was answered by the test because no local mail catcher runs, so no real email was seen).
- **Rollback:** remove `<EmailConfirmReminder />` from `AppShell.vue` and turn "Confirm email" back on. The table can stay.

## 2026-11-24: email links that work in any browser

- **What:** `src/features/auth/emailLink.ts`, a few lines in `src/stores/auth.ts` (`ready`), the router guard, `ResetPasswordView.vue`, and the links in `supabase/templates/recovery.html` and `magic_link.html`.
- **Why:** a live test on 2026-11-24 opened a reset link in a browser other than the one that asked for it. The page showed the email form again. The client uses the PKCE flow, whose secret stays in the asking browser; mail apps and home-screen apps often open links elsewhere.
- **How:** the email carries `token_hash` and `type`; on start the app calls `verifyOtp` with them before reading the session, and the router strips them from the address.
- **Trade-off:** a mail scanner that runs page scripts could use up a link before the person does; they would see "That link is too old" and ask again.
- **Watch:** keep `flowType: 'pkce'`; do not go back to `{{ .ConfirmationURL }}` in these two templates. `confirmation.html`, `invite.html` and `email_change.html` still use it and have the same limit; confirmation is unused while "Confirm email" is off.
- **Verification:** `emailLink.spec.ts` (5 tests); local browser run in fresh browsers: reset link, used link, sign-in with the new password, "Open Azaria" link. Not yet run on the live site.
- **Rollback:** put `{{ .ConfirmationURL }}` back in the two templates; the app code can stay.

## 2026-11-24: shorter set-up, install row in the profile menu

- **What:** `CreateBusinessView.vue` asks only for the shop's name and kind, sends Ghana, GHS and Africa/Accra, and goes to Home. `InstallApp.vue` is rendered by `ProfileMenu.vue`, not `SettingsView.vue`. `e2e/helpers.ts` follows the new path and puts off the email reminder.
- **Why:** the owner reported that people found registering too long and were bored before reaching the books. He chose Ghana only for now; other countries come back later.
- **How:** the three choices were removed from the screen only. `rpc_create_business_and_owner`, `src/utils/locales.ts` and the database still accept every country, so nothing needs migrating to open them again.
- **Trade-off:** a shop outside Ghana gets cedis and Accra time and cannot change them at set-up. The "People and phones" first-visit text in `MembersView.vue` (`?first=1`) is no longer reached from set-up.
- **Verification:** phone-size browser run on the local stack: two fields, straight to Home, shop stored as GH, GHS, Africa/Accra, install row in the profile menu and gone from Settings. The Playwright specs were edited but not run.
- **Rollback:** restore the three `AppSelect` rows and the `members` redirect in `CreateBusinessView.vue`.
