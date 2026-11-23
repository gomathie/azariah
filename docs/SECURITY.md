# Security

The browser uses the publishable Supabase key. It cannot bypass membership checks. Financial tables have no insert or update grant for the signed-in role. Writes go through `rpc_*` functions that call `assert_member` and record `p_client_operation_id`.

## Who can do what

| Action | Owner | Manager | Staff | Viewer |
|---|---|---|---|---|
| Record a sale, expense, collection, or transfer | Yes | Yes | Yes | No |
| Reverse an entry | Yes | Yes | No | No |
| Invite a member | Yes | Yes, except the owner role | No | No |
| Export the business | Yes | No | No | No |

The last active owner cannot be demoted or removed. A membership id from another business is rejected. An account or category from another business is rejected.

## Typed text is data

Whatever a person types is stored as text and shown as text. It is never run as a query, a command, a formula, a link or markup.

| Risk | What stops it | Checked by |
|---|---|---|
| SQL injection | Every database function takes typed parameters. No function builds SQL from text. The app uses the Supabase client, which sends values separately from the query. | `0017_text_safety.test.sql`: SQL typed into a shop name, a customer name, a description and a note is stored word for word and no table or row is lost. |
| Search used as a pattern or a query | Search text is escaped before `LIKE`. | Same file: `' or '1'='1` matches nothing; `%` and `_` are literal. |
| Script injection (XSS) | Vue escapes all text. The app has no `v-html` and no `innerHTML`. The guides are parsed into plain data, not HTML. The Content Security Policy allows scripts from the site only. | Browser run 2026-11-22: a customer named `<img src=x onerror=alert(1)>` showed as text, no element was created, no script ran. `guide.spec.ts`. |
| Formula injection in downloads | Excel cells holding text are inline strings, never formulas. PDFs draw text only. | `xlsx.spec.ts`. |
| Filter injection | The one place a value is placed inside a filter string, the daybook's next-page cursor, accepts only an exact date, timestamp and id. | `safe.spec.ts`. |
| Redirect to another site after sign-in | Only a path inside the app is followed. | `safe.spec.ts`; browser run with `//evil.example` landed on Home. |
| Hidden or reordered text | Control characters, zero-width characters and direction overrides are removed, in the browser's single write path and again by database triggers. | `safe.spec.ts`, `0017_text_safety.test.sql`. |
| A phone field used for something else | The database accepts only digits, spaces and `+ ( ) . -`, at most 32 characters. The WhatsApp link uses digits only. | `0017_text_safety.test.sql`. |
| Oversized input | Length limits on every free-text column, and `maxlength` on inputs. | `0017_text_safety.test.sql`. |
| Known holes in libraries | `npm audit --omit=dev` reported 0 vulnerabilities on 2026-11-22. Run it before each release. | Manual. |

Rules for new code: never build SQL from text; never use `v-html`; put any new free-text column in a cleaning trigger with a length limit; validate a value before placing it in a filter string; add the hostile-input case to `0017_text_safety.test.sql`.

Not covered: rate limiting and sign-in abuse controls are Supabase's defaults; two-step sign-in is not built; uploaded files do not exist yet.

## Support team access

The support team can open any shop, by the owner's decision of 2026-11-23. See ADR-011, which replaces the consent rule of ADR-009.

| Right | What it allows |
|---|---|
| (any admin) | The overview counts, the shop directory, the list of accounts |
| `view_shops` | Open any shop and read it |
| `edit_shops` | Open any shop and do what its owner can do; includes reading |
| `suspend_shops` | Suspend or reactivate a shop, with a reason |
| `billing` | Discount codes, the payments switch for everyone or one shop, plan prices |
| superadmin | Every right, and adding, changing or removing admins |

What limits it:

- An admin reads or writes a shop only after opening it. The opening is audited against the admin, lasts two hours, and the owner sees it in Settings, Privacy and data.
- Rights are checked on every read and write, so removing a right or an admin takes effect at once, even with a shop open.
- A shop opened to look cannot be written to, also by a superadmin.
- What an admin writes is stored under the admin's own user id. Nobody signs in as another person and no password is shared.
- Only a superadmin manages admins, and never their own entry, so there is always at least one superadmin.
- No table that holds rights or open shops is readable or writable through the API.

What this costs: a stolen admin password with `edit_shops` can read and change every shop's records. Keep the team small, give `edit_shops` to few people, use a strong unique password for each admin, and remove people who leave. Two-step sign-in for admins is not built yet.

## Payments and discount codes

See ADR-010.

| Who | Can | Cannot |
|---|---|---|
| Owner | Start the free trial, open a payment, check a discount code, see the shop's payments | Mark a payment paid, set a price, write any billing table |
| Manager | See whether Plus is on and the shop's payments | Pay or start a trial |
| Staff | See whether Plus is on | See payments, pay |
| Platform admin with `billing` | Make, list and switch off discount codes; turn payments on or off for everyone or one shop; set plan prices; see until when a shop has Plus | Give a shop Plus directly or mark a payment paid |
| Platform admin with `edit_shops`, shop open for changes | What the shop's owner can do, including starting a trial or a payment | Mark a payment paid |
| Paystack webhook | Report a payment | Change anything unless its signature is right and Paystack's verify call agrees on amount and currency |

- `paystack-webhook` is the only address in the project that takes no sign-in. It accepts POST only, checks the `x-paystack-signature` header (HMAC-SHA512 of the raw body with the secret key) before parsing, and logs the event type and reference, never the payload.
- `billing-checkout` and `billing-verify` need the signed-in person's token and act as that person, so row security applies. They accept calls from one origin, `APP_URL`.
- The checkout address must be on `paystack.com`, or the function refuses to return it. The return screen accepts a reference only in our own format.
- Paystack receives the owner's sign-in email, the amount, and the shop's id and product code. It receives nothing from the books.
- Secrets: `PAYSTACK_SECRET_KEY` is set with `supabase secrets set`. It is never in the repository and never in a `VITE_` variable. For a local trial it may sit in the gitignored `.env`; it is never a Cloudflare Pages variable.
- Known limit: a signed-in owner can try discount codes one after another. Codes are at least six characters and are never listed, but there is no rate limit yet. Give out codes that are hard to guess.
- Checked by `supabase/tests/0018_billing.test.sql` (53 assertions), `src/features/billing/__tests__` (16 tests), and a local run of the three functions with a dummy key on 2026-11-23.

## Isolation

Every business table has `business_id` and row level security. `auto_expose_new_tables` is false, so a new table stays hidden until its grant and policy are written. Tests for the earlier tables are in `supabase/tests/0003_rls.test.sql`.

## Secrets

`.env` is gitignored. `.env.example` has placeholders. The CI workflow writes a local demo key into `.env` on the runner and does not commit it. Do not run `supabase db reset --linked` or any destructive command against a remote project.

The cloud project `azaria` has a database password and a secret API key. The owner holds both; neither is in the repository, in `.env` files, or in the browser. The browser uses only the publishable key. On 2026-11-22 an anonymous request to nine cloud tables was refused (401, code 42501).

## If something looks wrong

Stop using the affected business, export a copy if an owner still can, and review `audit_events` for `transaction.reversed`, `membership.invited`, `export.created`, and every action that starts with `support.`. There is no hosted incident process yet because there is no production project.

## Error tracking

Errors in the browser are sent to Sentry when `VITE_SENTRY_DSN` is set at build time; without it nothing is sent. `src/lib/monitoring.ts` turns off user details, cookies, headers, request bodies and query strings, drops console lines and typed text, and cuts every web address down to its path, so a report carries no figures, customer names or emails. There is no session replay and no performance tracing. The Sentry hosts are listed in `connect-src` in `public/_headers`.
