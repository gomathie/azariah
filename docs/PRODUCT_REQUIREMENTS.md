# Product requirements

Azaria is a phone-first bookkeeping app for a small shop. The owner records what happened today: a sale, an expense, a later payment, or money moved between Cash and Mobile Money. The app keeps those events, then shows cash, debts, and reports from them.

## Personas

- **Owner.** Creates the business, records entries, reverses mistakes, invites people, and downloads the data.
- **Manager.** Records entries and reverses mistakes. Cannot grant the owner role.
- **Staff.** Records sales and expenses. Cannot reverse entries, invite people, or export the business.
- **Viewer.** Can read. Cannot record.

## Main flows

1. Sign up, then create a business with country, currency, and time zone. The owner membership, Cash, Mobile Money, and starter categories are created together.
2. Add a sale. Money received now goes to an account. Anything still owed needs a customer.
3. Add an expense, or record goods bought to resell. Those stay separate.
4. Record a later customer payment. It reduces the oldest debt and is not a new sale.
5. Move money between two accounts.
6. Open the daybook, open an entry, and reverse it when it was a mistake.
7. Read Home and Reports for a date range. Download a CSV or a full JSON copy.
8. If the phone is offline, a sale or an expense stays on the phone and is sent later.

## Acceptance

The target journey is the one in spec §16: Ama's Provision Shop, the sales and payments in scenarios A–H, a transfer, a reversal, and an offline sale that becomes one daybook row. That journey has not been run yet. See `docs/TEST_REPORT.md`.

## MVP boundary

In the app now: auth, one business, sales, expenses, stock purchases, owner movements, opening balances, collections, transfers, reversals, dashboard, reports, CSV, owner export, membership changes, English and French, and an offline queue for sales and expenses.

Not in the app: inventory quantities, supplier debts, invoices, receipt photos, profit, and multi-currency transactions. Those stay on the roadmap.
