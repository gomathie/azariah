# Roadmap

Updated 2026-11-16. "Written" means the code is in the repo. "Verified" means the named check passed.

## P0

| Area | State |
|---|---|
| Auth, business setup, money utilities, sale and spend RPCs | Verified in unit or SQL runs on 2026-11-16 |
| Onboarding in the browser | Written. Playwright not run |
| Sales, expenses, collections, transfers, reversals, dashboard, reports, export, members, offline queue, help | Written. Earlier checks passed for tasks 1–18 |
| Invoices and receipt PDFs | Written. PDF unit test PASS (3). SQL `0014_documents` PASS (18) on 2026-11-17 |
| CI workflow and the docs in spec §15 | Written. CI not run |

## P1, not started

Supplier debts, inventory quantities, cost and estimated profit, receipt photos, French review beyond the current strings, mentor summaries.

## P2, not started

Branches, stock valuation, multi-currency transactions, and anything that needs a hosted production project.

## Added on 2026-11-22

- Done locally: report breakdowns, PDF and Excel downloads, owner money screen, customer edit, account menu, quick actions and recent entries on Home, consent-based support access (ADR-009).
- Waiting on the owner: applying migrations `20261122000100` and `20261122000200` to the cloud database; naming the first platform admin; an email provider; staging versus production.
- Next ideas, not started: two-step sign-in for platform admins; telling the owner by email when support opens their shop; a filter and search in the daybook; close-of-day cash count; a WhatsApp daily summary.
