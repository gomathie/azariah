# Azaria Plus: easy mode as a paid upgrade, with Paystack

Written 2026-11-23. Status: proposed, nothing built. This plan is separate from the MVP plan
(`2026-11-16-azaria-mvp.md`); do not start it until the owner has answered the decisions in section 2.

## 1. Goal

A shop pays to upgrade to **Azaria Plus**. Plus turns on the features that make the app usable by
someone with little schooling: the app reads itself aloud, a sale can be recorded with pictures and
a number pad, every save is confirmed and can be undone, and Home can be switched to a simple view.
Payment goes through Paystack, in Ghana cedis, by Mobile Money or card.

The research behind the feature list is summarised in section 11.

## 2. Decisions the owner must make first

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| D1 | Price and periods | One price per shop; sell 1, 3 and 12 months, with a discount on the longer ones | Sets the Paystack amounts and the upgrade screen |
| D2 | Free trial | 14 days of Plus for every new shop, once | A person who cannot read cannot find or trust an upgrade screen without first hearing the app speak |
| D3 | What stays free | Keep the save confirmation and undo free; consider keeping "listen" on the Home total free | Undo is a safety feature. Putting every aid behind payment locks out the people the aid is for |
| D4 | Who can pay | Owner role only | Matches the existing rule that writes name the roles they accept |
| D5 | When Plus runs out | Seven days of grace, then Plus features switch off; records and the standard app are never locked | Nobody should lose access to their own books over a missed payment |
| D6 | Twi voice | Pay a Twi speaker to record the clips | No phone ships a Twi voice, and the machine voice used in the ads is unreviewed |
| D7 | Refunds and receipts | Refunds handled by the owner in the Paystack dashboard; the app emails nothing itself | Keeps the first version small |

D2 and D3 are product and fairness calls, not technical ones. The plan below assumes the recommendations.

## 3. What Plus contains

| Feature | What the user gets | Phase |
|---|---|---|
| Listen | A speaker button on every screen title, label and amount. Tapping it reads the text aloud in the chosen language | 3 |
| Picture sale | Add sale as a number pad and three picture choices (paid in full, partly paid, not paid yet), plus pictures for cash and Mobile Money. No keyboard needed | 4 |
| Spoken confirmation | After saving: a large tick, the amount spoken, and one Undo button | 4 (visual tick and Undo are free, per D3) |
| Simple Home | Three large picture buttons (sold something, spent money, who owes me) and today's total. Everything else behind "More" | 5 |
| Spoken first-run tour | Four screens with a voice and a moving finger, replacing the written guide for Plus shops | 5 |

Out of scope for this plan: voice input, stock counting by picture, WhatsApp entry.

## 4. How payment works

Paystack in Ghana cannot charge Mobile Money again without the customer approving each payment: its
documentation says Mobile Money authorisations are not reusable, and its recurring product needs a
card. Most Azaria shops will pay by Mobile Money. So the design is **prepaid time**, not a
subscription in Paystack's sense:

1. The owner picks 1, 3 or 12 months and taps Pay.
2. The app asks an Edge Function for a payment. The function creates a Paystack transaction and
   returns Paystack's hosted checkout address.
3. The app sends the browser to that address. The owner approves on their phone (Mobile Money
   prompt) or enters a card.
4. Paystack calls our webhook. The webhook checks the signature, confirms the payment with
   Paystack's verify call, and extends the shop's paid-until date.
5. Paystack sends the owner back to the app, which shows "Plus is on until 23 February".
6. Seven and two days before the date, the app shows a renewal reminder. Renewing adds time to the
   existing date; it never shortens it.

Card auto-renewal through Paystack Subscriptions is a later option (phase 7). It is not needed to launch.

**Why a redirect and not Paystack's pop-up:** the site's security header allows scripts from our own
origin only. A redirect keeps that rule intact. The pop-up would mean allowing Paystack's script
and frame on every page.

## 5. Architecture

### 5.1 Rules (proposed as ADR-010)

- **The client never grants Plus.** Only the webhook, running with the service role, writes billing rows.
- **Entitlement is derived.** `has_plus(business_id)` reads the paid-until date; no boolean is stored.
- **Every payment is idempotent** on Paystack's reference. A webhook delivered twice extends the date once.
- **Money is bigint minor units** (pesewas), as everywhere else (ADR-001).
- **The secret key lives only in Edge Function secrets.** Never in the repository, never in a `VITE_` variable.
- **Plus features are aids, not locks.** Server rules do not block any bookkeeping action for unpaid shops.

### 5.2 Database (one migration, `supabase/migrations/2026MMDD000100_billing.sql`)

| Table | Purpose | Key columns |
|---|---|---|
| `billing_products` | The periods on sale | `code` (`plus_1m`, `plus_3m`, `plus_12m`), `months`, `amount_minor`, `currency`, `active` |
| `billing_payments` | One row per Paystack transaction | `business_id`, `product_code`, `reference` (unique), `amount_minor`, `currency`, `status` (`pending`, `paid`, `failed`), `channel`, `paid_at`, `created_by` |
| `business_entitlements` | One row per shop | `business_id` (primary key), `plus_until timestamptz`, `trial_used boolean`, `updated_at` |
| `billing_events` | Raw webhook log for audit and replay | `event_id` or body hash (unique), `event_type`, `reference`, `received_at`, `processed_at`, `payload jsonb` |

- RLS on all four, with explicit grants. Members may read their own shop's entitlement and payments.
  Nobody but the service role may insert or update. `billing_products` is readable by any signed-in user.
- `billing_events.payload` holds Paystack's payload, which includes the payer's email and masked
  card or phone details. No client role may read this table.
- Indexes: `billing_payments (business_id, created_at desc)`, unique on `reference`.

Functions:

| Function | Caller | Does |
|---|---|---|
| `has_plus(p_business_id)` | any member; used by `rpc_billing_status` | True while `plus_until + grace` is in the future |
| `rpc_billing_status(p_business_id)` | member | Returns `plus_until`, days left, whether in grace, whether the trial is available, and the products |
| `rpc_start_trial(p_business_id, p_client_operation_id)` | owner | Sets `plus_until = now() + 14 days` once; refuses if `trial_used` |
| `billing_apply_payment(p_reference, ...)` | service role only | Marks the payment paid and sets `plus_until = greatest(plus_until, now()) + months`, in one transaction, only if the payment was not already paid |

`rpc_admin_list_businesses` (support console) gains a Plus column, read-only, in line with ADR-009.

### 5.3 Edge Functions (the repository's first; `supabase/functions/`)

| Function | Auth | Does |
|---|---|---|
| `billing-checkout` | Signed-in user's token | Checks the caller is the shop's owner, reads the price from `billing_products` (never from the request), inserts a `pending` payment with a generated reference, calls Paystack's initialise-transaction endpoint with amount, currency `GHS`, the reference, the return address and the channels `mobile_money` and `card`, and returns the checkout address |
| `paystack-webhook` | None (public); verified by signature | Checks the `x-paystack-signature` header against an HMAC-SHA512 of the raw body made with the secret key, stores the event, and for `charge.success` calls Paystack's verify endpoint, compares amount and currency with the pending row, then calls `billing_apply_payment`. Always answers 200 quickly once the event is stored |
| `billing-verify` | Signed-in user's token | Called when the owner lands back in the app. Runs the same verify-and-apply path for one reference, so Plus turns on even if the webhook is late |

- Secrets: `PAYSTACK_SECRET_KEY`, set with `supabase secrets set`. Test key locally and on staging; live key on production only.
- The only personal detail sent to Paystack is the owner's sign-in email, which Paystack requires. Metadata carries the shop's id and the product code, nothing else.
- Confirm against Paystack's current documentation at build time: endpoint paths, the exact event names, the webhook source addresses, and whether `channels` accepts both values for a Ghana account.

### 5.4 App

| Piece | Where | Notes |
|---|---|---|
| Entitlement store | `src/stores/billing.ts` | Loads `rpc_billing_status`; exposes `hasPlus`, `daysLeft`, `inGrace` |
| Offline cache | Dexie | Keeps the last status with its paid-until date. Offline, Plus stays on until that date plus grace; the server stays the authority once back online |
| Upgrade screen | `src/features/billing/UpgradeView.vue`, route `/settings/plus` | Shows what Plus does (with a "listen" button that works for everyone on this one screen), the three periods, Start trial, Pay |
| Return screen | `src/features/billing/PaymentReturnView.vue`, route `/settings/plus/return` | Reads the reference from the address with `safe.ts` validation, calls `billing-verify`, shows the result |
| Feature gate | `usePlus()` composable | Components ask `hasPlus`; a locked feature shows a small padlock that opens the upgrade screen |
| Profile menu and Settings | existing | "Azaria Plus" entry showing the state |
| Copy | `src/i18n/en.json`, `fr.json`, `tw.json` | Plain words: "Upgrade", "Pay with Mobile Money", "Plus is on until …". Never "subscription tier" |
| Security header | `public/_headers` | No script or frame change needed with the redirect. `connect-src` already covers the Supabase functions address |

## 6. Phases and tasks

Each task ends with its check. Follow the project skill for migrations, RPCs and tests.

### Phase 0: accounts and decisions (owner)

- [ ] Answer D1 to D7.
- [ ] Open a Paystack business account for Ghana and complete its compliance steps; live keys are not issued until then.
- [ ] Decide staging versus production for the Supabase project (still open from the MVP plan). The webhook needs one stable address per environment.
- [ ] Engage a Twi speaker for recording and for a review of the existing Twi text.

### Phase 1: billing backend

- [ ] 1.1 Migration: four tables, RLS, grants, indexes, seed three products (prices from D1).
- [ ] 1.2 `has_plus`, `rpc_billing_status`, `rpc_start_trial`, `billing_apply_payment`.
- [ ] 1.3 pgTAP file `supabase/tests/0018_billing.sql`: a member cannot write any billing table; a cashier cannot start a trial; the trial works once; applying the same reference twice extends once; renewing early adds to the existing date; another shop's rows are invisible; grace boundary is correct.
- [ ] 1.4 Regenerate `src/types/database.ts`.
- [ ] 1.5 Add ADR-010 and update `docs/DATA_DICTIONARY.md` and `docs/SECURITY.md`.
- Check: `npx supabase test db` passes with the new file.

### Phase 2: Paystack

- [ ] 2.1 `billing-checkout`, `paystack-webhook`, `billing-verify`, with shared signature and verify helpers.
- [ ] 2.2 Unit tests for the helpers (Deno): a good signature passes; a changed body fails; a wrong amount or currency is refused; a replayed event is ignored.
- [ ] 2.3 Local run against Paystack **test** keys with `supabase functions serve` and a tunnel for the webhook. Pay with Paystack's test Mobile Money number and test card.
- [ ] 2.4 Billing store, upgrade screen, return screen, menu entries, three languages.
- [ ] 2.5 Vitest for the store (grace, offline cache, expiry) and Playwright for the upgrade screen with the functions mocked.
- [ ] 2.6 `docs/DEPLOYMENT.md`: secrets, webhook address, how to switch test and live keys. `docs/ADMIN_GUIDE.md`: how to check a payment and what to do when a customer says they paid.
- Check: a test payment turns Plus on locally through the webhook alone, and separately through the return screen alone.

### Phase 3: Listen

- [ ] 3.1 `src/utils/speak.ts`: English and French through the phone's built-in voice; Twi through recorded clips keyed by translation key.
- [ ] 3.2 Amounts spoken from the bigint value ("one hundred and twenty cedis"), with unit tests per language.
- [ ] 3.3 `ListenButton.vue` in the shared UI; add to screen titles, form labels, totals and entry rows.
- [ ] 3.4 Twi clips recorded (D6), stored as static files and cached by the service worker for offline use. Until they exist, Twi falls back to showing the button disabled with an explanation; do not ship the machine voice.
- Check: unit tests pass; manual check on a real Android phone in each language, online and offline.

### Phase 4: picture sale, confirmation and undo

- [ ] 4.1 Number pad and picture choices as a Plus layout of the existing Add sale screen. It calls the same `rpc_` function; no new write path.
- [ ] 4.2 Confirmation sheet with tick and amount (free), spoken amount (Plus).
- [ ] 4.3 Undo: the existing reversal RPC if one covers a just-saved sale, otherwise a new `rpc_` function that voids within a short window, with pgTAP tests. Must work from the offline queue.
- Check: Playwright spec records and undoes a sale on the phone profile without the keyboard opening.

### Phase 5: simple Home and spoken tour

- [ ] 5.1 Simple Home as a preference stored per person, default on for new Plus shops, switchable in Settings.
- [ ] 5.2 Spoken first-run tour.
- Check: Playwright spec for both Home modes; the phone walk-through script reports no layout problems at 360 and 393 pixels wide.

### Phase 6: field test, then launch

- [ ] 6.1 Watch five to eight traders at a market record a sale, hear a total and pay for Plus in test mode. Fix what they stumble on. This is the test the research cannot replace.
- [ ] 6.2 Dry run of the migration against the cloud project, then push with the owner's go-ahead.
- [ ] 6.3 Deploy the functions, set the live key, register the webhook address in Paystack, make one real payment of the smallest period and confirm it.
- [ ] 6.4 Update `CHANGELOG.md`, `USER_GUIDE.md` (and French copy), `ROADMAP.md`, `TEST_REPORT.md`, `HANDOFF.md`, and the status checkpoint in `AGENTS.md`.

### Phase 7 (later, optional): card auto-renewal

Paystack plans and subscriptions for owners who pay by card, with the `subscription.*` and
`invoice.*` webhook events. Paystack does not retry a failed subscription charge, so the reminder
flow from section 4 stays as the fallback.

## 7. Failure cases the build must handle

| Case | Handling |
|---|---|
| Owner pays, webhook never arrives | Return screen verifies directly; a "Check my payment" button on the upgrade screen does the same for any pending payment |
| Webhook arrives twice, or out of order | Unique reference and the paid-once check in `billing_apply_payment` |
| Forged webhook | Signature check, then verify call to Paystack before any change |
| Amount tampered in the browser | Price is read on the server from `billing_products`; verify compares the paid amount |
| Owner closes the checkout | Payment stays `pending`; no effect; pending rows older than a day are ignored |
| Phone offline when Plus expires | Cached date plus grace; features switch off locally at that point |
| Two owners pay at the same moment | Both payments count; time is added twice. Shown plainly in payment history |
| Refund or chargeback | Manual in phase 2: support notes it and the owner adjusts the date with a service-role script. Automating it is a later task |

## 8. Security and privacy

- No secret in the repository or in client variables. Rule 5 of `AGENTS.md` applies.
- The webhook is the only unauthenticated endpoint the project exposes. It accepts POST only, reads the raw body once, checks the signature before parsing, and logs nothing but the event type and reference.
- The return address is validated with `safeInternalPath` and the reference with a strict pattern before use.
- Support staff (ADR-009) can see whether a shop has Plus. They cannot grant it.
- Update the privacy text in the app: Paystack receives the owner's email and the payment.

## 9. What this does not change

Bookkeeping stays free and complete. Money stays in minor units, writes stay in `rpc_` functions,
balances stay derived, and RLS stays on with explicit grants (ADR-001 to ADR-004).

## 10. Rough size

| Phase | Size |
|---|---|
| 1 Billing backend | Small |
| 2 Paystack and upgrade screens | Medium |
| 3 Listen | Medium, plus the recording work outside the code |
| 4 Picture sale, confirmation, undo | Medium |
| 5 Simple Home and tour | Medium |
| 6 Field test and launch | Depends on what the traders show |

Phases 1 and 2 can ship ahead of the features only if there is something to sell, so the first
release should be phases 1 to 3 together.

## 11. Sources

- Medhi et al., "Designing Mobile Interfaces for Novice and Low-Literacy Users", ACM ToCHI 2011: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ToCHI2711_Medhi.pdf
- "Some Evidence for Impact of Limited Education on Hierarchical User Interface Navigation": https://www.microsoft.com/en-us/research/?p=164235
- Knoche and Huang, "Text is not the enemy": https://researchgate.net/profile/Hendrik-Knoche/publication/266595198_Text_is_not_the_enemy_How_illiterates'_use_their_mobile_phones/links/5849ac7508ae5038263d88aa/Text-is-not-the-enemy-How-illiterates-use-their-mobile-phones.pdf
- MicroSave, "Mobile Wallet Design for Oral Users": https://www.microsave.net/wp-content/uploads/2017/05/Mobile_Wallet_Design_for_Oral_Users.pdf
- CGAP, "Literacy a Hidden Hurdle to Financial Inclusion": https://cgap.org/node/2378
- Paystack, Mobile Money in Ghana (authorisations are not reusable): https://paystack.com/docs/v2/gh/payments/channels/mobile-money
- Paystack, Subscriptions: https://paystack.com/docs/payments/subscriptions/
- Paystack support, "Pay with Mobile Money": https://support.paystack.com/hc/en-us/articles/360012174020-Pay-with-Mobile-Money
