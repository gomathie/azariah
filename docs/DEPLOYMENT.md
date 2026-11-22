# Deployment

One cloud Supabase project exists. Do not create another, and do not push migrations to it, unless the owner asks.

## Cloud project

| | |
|---|---|
| Name | `azaria` |
| Project ref | `zqxmlgeqvrmbczjsurtj` |
| Organization | gomathie's Org |
| Region | eu-west-2 (London) |
| API URL | `https://zqxmlgeqvrmbczjsurtj.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/zqxmlgeqvrmbczjsurtj |
| Created | 2026-11-22 by the owner's instruction |

- The repository is linked with `npx supabase link --project-ref zqxmlgeqvrmbczjsurtj`. Link data is in `supabase/.temp`, which is gitignored, so each machine links once after `npx supabase login`.
- The CLI labels this project "production". The spec asks for separate staging and production projects. Only this one exists, and the owner has not yet said which it is. Treat it as production: synthetic test data does not go in it.
- Migrations `20261116000100` through `20261116001500` were applied on 2026-11-22. `npx supabase migration list --remote` showed all 15 matching.
- The database password is held by the owner. It is not in the repository. Commands that need it read `SUPABASE_DB_PASSWORD` from the shell.
- The frontend reads the cloud URL and publishable key from `.env.production.local`, which is gitignored and used by `npm run build`. `.env` stays on the local stack so `npm run dev` and the tests never touch the cloud project.
- No frontend is deployed. Auth redirect URLs, email (SMTP) and backups on the cloud project are still at Supabase defaults.

### Pushing a migration

The CLI targets the local stack unless `--remote` is given.

1. `npx supabase db reset` and `npx supabase test db` pass locally.
2. `npx supabase db push --remote --dry-run` and read the list. It must name only the new files.
3. With the owner's go-ahead: `npx supabase db push --remote --yes`.
4. `npx supabase migration list --remote` shows local and remote equal.

Never run `supabase db reset --linked` or `--remote`.

## Local

1. `npm install`
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `npx supabase status`.
3. `npx supabase start -x studio,imgproxy,edge-runtime,pgbouncer,realtime,storage-api,vector,logflare`
4. `npx supabase db reset` applies `supabase/migrations` and `seed.sql` on the local database only.
5. `npm run dev` serves the app at http://localhost:5173.

Auth redirects in `supabase/config.toml` allow localhost and 127.0.0.1 on ports 5173 and 4173. A stack restart is required after that file changes.

## CI

`.github/workflows/ci.yml` installs dependencies, lints, type-checks, runs Vitest, starts the local stack, runs `supabase test db`, builds with the local publishable key, and runs Playwright on Chromium. It has not been executed.

## Rollback

On a local database, `npx supabase db reset` rebuilds from migrations. On the cloud project there is no automatic rollback. Repair forward: write a new migration that undoes the change, test it locally, then push it. Check which backups the plan includes in the dashboard before any real data goes in.
