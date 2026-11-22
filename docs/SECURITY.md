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
