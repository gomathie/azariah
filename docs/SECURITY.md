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

## Isolation

Every business table has `business_id` and row level security. `auto_expose_new_tables` is false, so a new table stays hidden until its grant and policy are written. Tests for the earlier tables are in `supabase/tests/0003_rls.test.sql`.

## Secrets

`.env` is gitignored. `.env.example` has placeholders. The CI workflow writes a local demo key into `.env` on the runner and does not commit it. Do not run `supabase db reset --linked` or any destructive command against a remote project.

The cloud project `azaria` has a database password and a secret API key. The owner holds both; neither is in the repository, in `.env` files, or in the browser. The browser uses only the publishable key. On 2026-11-22 an anonymous request to nine cloud tables was refused (401, code 42501).

## If something looks wrong

Stop using the affected business, export a copy if an owner still can, and review `audit_events` for `transaction.reversed`, `membership.invited`, and `export.created`. There is no hosted incident process yet because there is no production project.
