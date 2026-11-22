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

The Azaria support team has no standing access to any shop. See ADR-009.

| What | Without the owner's consent | While the owner's grant is live |
|---|---|---|
| Find a shop by name or owner email | Yes | Yes |
| See status, country, member count, last entry date | Yes | Yes |
| Read sales, balances, customers, entries, reports | No | Yes, that shop only |
| Add, change, reverse or delete anything | No | No |
| Download the whole shop | No | No |
| Suspend or reactivate a shop, with a reason | Yes | Yes |

- The owner grants and revokes in Settings, Privacy and data. A grant lasts 24 hours, 3 days or 7 days and ends by itself.
- The owner and managers see a list of what support did: granted, opened, stopped, status changed.
- A support look lives in the browser's memory. Reloading the page ends it.
- An admin is added with SQL only:

```sql
insert into public.platform_admins (user_id, note)
select id, 'who and why' from auth.users where email = 'person@example.com';
```

  Remove one with `delete from public.platform_admins where user_id = ...`. Keep this list short, and give each admin a strong password. Two-step sign-in for admins is not built yet.
- Checked by `supabase/tests/0016_support_access.test.sql` (47 assertions) and a browser run on 2026-11-22.

## Isolation

Every business table has `business_id` and row level security. `auto_expose_new_tables` is false, so a new table stays hidden until its grant and policy are written. Tests for the earlier tables are in `supabase/tests/0003_rls.test.sql`.

## Secrets

`.env` is gitignored. `.env.example` has placeholders. The CI workflow writes a local demo key into `.env` on the runner and does not commit it. Do not run `supabase db reset --linked` or any destructive command against a remote project.

The cloud project `azaria` has a database password and a secret API key. The owner holds both; neither is in the repository, in `.env` files, or in the browser. The browser uses only the publishable key. On 2026-11-22 an anonymous request to nine cloud tables was refused (401, code 42501).

## If something looks wrong

Stop using the affected business, export a copy if an owner still can, and review `audit_events` for `transaction.reversed`, `membership.invited`, `export.created`, and every action that starts with `support.`. There is no hosted incident process yet because there is no production project.
