# Test report

Date: 2026-11-16. This file records runs that actually happened. A file existing is not a pass.

## Passed

| ID | Command | Result |
|---|---|---|
| SQL-1 | `npx supabase db reset` then `npx supabase test db` | PASS earlier. 5 files, 92 tests, before the later migrations. |
| UNIT-1 | `npx vitest run` on money, schemas, client, and the business store | PASS. Includes the `1.2.3` rejection |
| SQL-2 | `supabase db reset` then `supabase test db` | PASS on 2026-11-16. 13 files, 134 tests. |
| UNIT-2 | MoneyInput, then HomeView, queue, sync, and CSV | PASS. MoneyInput 2. The other four files, 9 tests. |
| E2E-1 | `npx playwright test e2e/onboarding.spec.ts` | PASS. 6 tests, chromium and mobile. |
| E2E-2 | add-sale, collection, daybook | PASS. 6 tests, chromium and mobile. |
| E2E-3 | `npx playwright test e2e/offline.spec.ts` | PASS. 2 tests. |

## Passed on 2026-11-22

| ID | Check | Result |
|---|---|---|
| SQL-15 | `npx supabase test db`, file `0015_report_breakdowns` | PASS. 11 assertions. |
| SQL-16 | `npx supabase test db`, file `0016_support_access` | PASS. 47 assertions. |
| SQL-ALL | `npx supabase test db` | PASS. 16 files, 210 tests. |
| UNIT | `npx vitest run` | PASS. 13 files, 50 tests. |
| LINT | `npm run lint` | PASS. It failed before this date on 8 mock-typing errors and generated files. |
| TYPES | `npx vue-tsc --build` | PASS. |
| BROWSER-1 | Scripted Chromium run on a phone viewport against the demo shop: Home, account menu, daybook, Add menu, owner money, record payment from Add, customer add and edit, seven reports, PDF and Excel download | PASS. No console errors. Not kept as a spec file. |
| BROWSER-2 | Scripted two-user Chromium run of support access: no access before the grant, read-only after, refused write, access gone after stop, ordinary user kept out | PASS. Not kept as a spec file. |
| FILES | Two downloaded `.xlsx` files opened in Excel 16; one PDF read back | PASS. |
| CSP | Production build served locally with the `public/_headers` policy: welcome, sign-up, login, service worker, Supabase sign-in call | PASS. Not checked on Cloudflare itself. |

### Later on 2026-11-22

| ID | Check | Result |
|---|---|---|
| SQL-17 | `npx supabase test db`, file `0017_text_safety` | PASS. 26 assertions. |
| SQL-ALL | `npx supabase test db` | PASS. 17 files, 236 tests. |
| UNIT | `npx vitest run` | PASS. 15 files, 67 tests. |
| AUDIT | `npm audit --omit=dev` | 0 vulnerabilities. |
| BROWSER-3 | Scripted Chromium run: hostile sign-in redirect, guides from Profile, hostile customer name and phone, Twi on Home, guide fallback note | PASS. No console errors. Not kept as a spec file. |

## Not run

| ID | What is on disk | Status |
|---|---|---|
| CI-1 | `.github/workflows/ci.yml` | Not run |
| E2E-4 | Help, privacy, settings, and French screens | No spec |
| E2E-5 | Customer add and edit, owner money, reports downloads, account menu, support access | Checked by one-off scripts on 2026-11-22. No spec file yet. |
| CLOUD | Migrations `20261122000100` and `20261122000200` on the cloud database | Not applied. The live database has neither. |

## Not claimed

Spec §16, the full Ama's Provision Shop demonstration, is not recorded as passed. No production deploy exists.
