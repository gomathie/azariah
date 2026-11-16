# Deployment

There is no production Supabase project. Do not create one, and do not push migrations, unless the owner asks.

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

On a local database, `npx supabase db reset` rebuilds from migrations. There is no remote rollback procedure because there is no remote project.
