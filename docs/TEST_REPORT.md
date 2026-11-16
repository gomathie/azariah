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

## Not run

| ID | What is on disk | Status |
|---|---|---|
| CI-1 | `.github/workflows/ci.yml` | Not run |
| E2E-4 | Help, privacy, settings, and French screens | No spec |

## Not claimed

Spec §16, the full Ama's Provision Shop demonstration, is not recorded as passed. No production deploy exists.
