# Product requirements

Azaria is a phone-first bookkeeping app for local traders and small informal shops. The owner records what happened today: a sale, an expense, a later payment, or money moved between Cash and Mobile Money. The app keeps those events, then shows cash, debts, and reports from them.

## Personas

- **Owner.** Creates the shop on their phone, records the day, and adds the other people and phones. An admin can correct mistakes.
- **Staff.** Records sales and expenses. Cannot undo an entry, invite an owner, or download the whole business.
- **Trader working alone.** Skips adding anyone and goes straight to the shop.

## Main flows

1. Sign up, then name the shop. Country, currency, and time zone are filled in and can be changed.
2. Add a person and the phone they use. Choose Staff or Admin. Staff is the usual choice. Skip this when you work alone.
3. Add a sale. Money received now goes to an account. Anything still owed needs a customer.
4. Add an expense, or record goods bought to resell. Those stay separate.
5. Record a later customer payment. It reduces the oldest debt and is not a new sale.
6. Move money between two accounts.
7. Open the daybook, open an entry, and reverse it when it was a mistake.
8. Read Home and Reports for a date range. Download a CSV or a full JSON copy.
9. If the phone is offline, a sale or an expense stays on the phone and is sent later.

## Acceptance

The target journey is the one in spec §16: Ama's Provision Shop, the sales and payments in scenarios A–H, a transfer, a reversal, and an offline sale that becomes one daybook row. That journey has not been run yet. See `docs/TEST_REPORT.md`.

## MVP boundary

In the app now: auth, one business, sales, expenses, stock purchases, owner movements, opening balances, collections, transfers, reversals, dashboard, reports, CSV, owner export, membership changes, English and French, and an offline queue for sales and expenses.

Not in the app: inventory quantities, supplier debts, invoices, receipt photos, profit, and multi-currency transactions. Those stay on the roadmap.
