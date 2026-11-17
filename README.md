# Azaria

Azaria is a phone-first bookkeeping app for local traders and small shops. It runs in the browser, and you can add it to the home screen so it opens like an app. It is its own product.

You record what happened today: a sale, an expense, a later payment, or money moved between Cash and Mobile Money. Azaria keeps those events and shows the cash, the debts, and the reports that come from them. It does not treat sales minus spending as profit.

The app is in English and French.

## What you can do

- Sign up, then name the shop. Country, currency, and time zone start filled in and can be changed.
- Add a person and the phone they use. Staff record sales and expenses. Staff cannot undo an entry, invite an owner, or download the whole business. An admin can correct mistakes. Someone working alone can skip this and go straight to the shop.
- Record a sale. Money received now goes to Cash or Mobile Money. Anything still owed needs a customer.
- Record an everyday expense separately from goods bought to resell.
- Record a later payment from a customer. It reduces the oldest debt and is not a new sale.
- Move money between Cash and Mobile Money.
- Open the daybook, open an entry, and reverse a mistake. The original stays, marked reversed.
- Read Home for today, this week, or this month: sales, money received, operating expenses, stock purchases, net cash movement, customer debts, and the money in each account.
- Make an invoice for a customer, or a receipt for money received, and download either as a PDF. The paper uses the sale or payment already recorded. It does not add a second sale.
- Open a report for a date range, download a CSV, or, as the owner, download a full copy of the business.
- Open Help, privacy, and profile from Settings.
- Add Azaria to the home screen.
- Save a sale or an expense on the phone when there is no connection, then tap Sync when the connection is back.

A later payment, a transfer, and a reversal still need a connection. Inviting someone to sign in works when they already have an Azaria account. A name and phone on the people list does not by itself create a sign-in.

## Not in the app yet

Inventory quantities, supplier debts, photos of paper receipts, profit, and transactions in more than one currency.

## For developers

Vue 3, TypeScript, Vite, Pinia, and Supabase. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the local stack. Do not commit `.env`.

```sh
npm install
npm run dev
```

The app is at http://localhost:5173. Local Supabase needs Docker. Start and stop it with `npx supabase start` and `npx supabase stop`. On this Windows machine the reserved port range blocks the default Studio port; see `AGENTS.md` before starting the stack.

```sh
npm run test:unit
npm run type-check
npm run lint
npm run build
npx playwright test
```

Product detail is in `docs/PRODUCT_REQUIREMENTS.md`. Decisions that stay fixed are in `docs/architecture/ADR.md`.
