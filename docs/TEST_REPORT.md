# Test report

Date: 2026-11-16. This file records runs that actually happened. A file existing is not a pass.

## Passed earlier this session

| ID | Command | Result |
|---|---|---|
| SQL-1 | `npx supabase db reset` then `npx supabase test db` | PASS. 5 files, 92 tests. Schema, business RPC, RLS, sale, spend. This was before collection, transfer, reversal, dashboard, reports, export, and membership tests existed |
| UNIT-1 | `npx vitest run` on money, schemas, client, and the business store | PASS. Includes the `1.2.3` rejection |

## Written, not run

| ID | What is on disk | Status |
|---|---|---|
| E2E-1 | `e2e/onboarding.spec.ts` | Not run |
| E2E-2 | `e2e/add-sale.spec.ts`, `e2e/collection.spec.ts` | Not run |
| E2E-3 | `e2e/daybook.spec.ts`, `e2e/offline.spec.ts` | Not run |
| SQL-2 | `supabase/tests/0006_collection.test.sql` through `0012_membership.test.sql` | Not run |
| UNIT-2 | MoneyInput, offline queue, offline sync, CSV, HomeView | Not run |
| CI-1 | `.github/workflows/ci.yml` | Not run |

## Not claimed

Spec §16, the full Ama's Provision Shop demonstration, is not recorded as passed. No production deploy exists.
