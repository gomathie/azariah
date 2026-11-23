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
- The project has one env file, `.env` (gitignored), with `.env.example` as its committed sample. Its active values stay on the local stack, so `npm run dev`, a local `npm run build` and the tests never touch the cloud project. The cloud URL and publishable key reach the deployed site through the Cloudflare Pages variables; `.env` keeps a commented copy of them ready to paste.
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

## Azaria Plus payments (Paystack)

Nothing here has been done on the cloud project. Each step needs the owner.

1. **Prices.** The migration seeds placeholder prices: GHS 30, 80 and 300 for 1, 3 and 12 months. Set the real ones before taking money, in minor units (pesewas):
   Prices can also be changed, and payments turned on or off for every shop, from the **Payments** tab of the Support console. Payments are off after the migration; nobody can pay until a platform admin turns them on.

```sql
update public.billing_products set amount_minor = 3000 where code = 'plus_1m';
```

2. **Migration.** `20261123000100_billing.sql` goes to the cloud the same way as any other: dry run, then push with the owner's go-ahead.
3. **Secrets.** In the Paystack dashboard, copy the secret key (test key first). Then:

```
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... APP_URL=https://your-app-address --project-ref <ref>
```

   `APP_URL` is the app's public address with no slash at the end. It is the only origin allowed to call the functions and the place Paystack sends the owner back to.
4. **Functions.** `npx supabase functions deploy billing-checkout billing-verify paystack-webhook --project-ref <ref>`. `supabase/config.toml` turns sign-in checking off for `paystack-webhook` only.
5. **Webhook.** In the Paystack dashboard, Settings, API Keys and Webhooks, set the webhook address to `https://<ref>.supabase.co/functions/v1/paystack-webhook`.
6. **Try it.** With the test key, pay with Paystack's test Mobile Money number and test card. Plus must turn on through the webhook alone (close the browser tab before returning) and through the return screen alone.
7. **Go live.** Swap in the live secret key with `supabase secrets set` and make one real payment of the shortest period.

Local trial of the functions: put the Paystack test key in `PAYSTACK_SECRET_KEY` in `.env` (gitignored; `APP_URL=http://localhost:5173` is already there) and run `npx supabase functions serve --env-file .env`. The key has no `VITE_` prefix, so the build never puts it in the browser code. It does not go to Cloudflare either. Paystack cannot reach a local webhook without a tunnel; the return screen works without one.

If an owner says they paid and Plus is off: ask them to open Settings, Azaria Plus and tap **Check my payment**. If that fails, find the reference in the Paystack dashboard and compare it with `billing_payments`. Refunds are made in the Paystack dashboard; the app does not shorten Plus by itself.

## Cloudflare Pages

The frontend is a static build. The owner connects the GitHub repository in the Cloudflare dashboard; agents do not deploy. As of 2026-11-22 no deployment has been made.

| Setting | Value |
|---|---|
| Framework preset | Vue |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

Production variables (Settings, Variables and Secrets). Section 2 of `.env` holds the same four lines, commented, ready to copy; `.env.example` shows the layout. The Paystack secret key is not one of them: it is a Supabase function secret (see "Azaria Plus payments").

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://zqxmlgeqvrmbczjsurtj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable key from `npx supabase projects api-keys` |
| `VITE_DEFAULT_LOCALE` | `en` |
| `NODE_VERSION` | `22.18.0` (the project needs Node 22.18 or newer) |
| `VITE_SENTRY_DSN` | Optional. The DSN from sentry.io, your project, Settings, Client Keys. Without it no error reports are sent. |

- Only the publishable key goes to Cloudflare. The secret key and the database password never do.
- Leave the Preview environment without these variables until a staging project exists. With them, every preview build would write to the production database.
- `npm run build` runs the type-check first. A type error fails the deploy.
- Page refreshes on deep links work because the build has no `404.html`, so Pages serves the app shell.

After the first deploy, in the Supabase dashboard under Authentication, URL Configuration: set Site URL to the Pages address and add `https://<pages-address>/**` to Redirect URLs. Until then, confirmation and password-reset emails link to localhost.

### Response headers

`public/_headers` is copied to `dist/_headers` and applied by Cloudflare Pages. It sets a Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, a referrer policy, a permissions policy and HSTS. Hashed files under `/assets/` are cached for a year; `sw.js`, `index.html` and the manifest are always revalidated so a new version reaches phones.

- `connect-src` names the Supabase host. If `VITE_SUPABASE_URL` changes, change `public/_headers` in the same commit, or every request to Supabase is blocked.
- `style-src` allows inline styles because Vue sets element styles at run time. Scripts are limited to the site itself.
- A custom domain needs no header change.
- Checked on 2026-11-22: the production build was served locally with this policy in Chromium. The welcome, sign-up and login screens rendered, the service worker registered, a sign-in request reached Supabase, and the console showed no policy violation. Not checked: the headers as served by Cloudflare itself, and the PDF and CSV downloads under the policy.

## CI

`.github/workflows/ci.yml` installs dependencies, lints, type-checks, runs Vitest, starts the local stack, runs `supabase test db`, builds with the local publishable key, and runs Playwright on Chromium. It has not been executed.

## Rollback

On a local database, `npx supabase db reset` rebuilds from migrations. On the cloud project there is no automatic rollback. Repair forward: write a new migration that undoes the change, test it locally, then push it. Check which backups the plan includes in the dashboard before any real data goes in.

## Error tracking (Sentry)

1. Create a project of type Vue at sentry.io and copy its DSN.
2. Add `VITE_SENTRY_DSN` to the Cloudflare Pages production variables and redeploy. The DSN is safe for the browser.
3. If the DSN's host is not `*.ingest.sentry.io`, `*.ingest.us.sentry.io` or `*.ingest.de.sentry.io`, add it to `connect-src` in `public/_headers`, or the browser will block the reports.
4. Reports are sent only from a production build. `npm run dev` and the tests send nothing.

What a report may contain is described in `docs/SECURITY.md`, "Error tracking".

## Sign-up and password emails

The emails Supabase sends are designed in `supabase/templates/`: `confirmation.html`, `recovery.html`, `invite.html`, `magic_link.html` and `email_change.html`. The local stack reads them through `supabase/config.toml`. The cloud project does not: in the Supabase dashboard open Authentication, Emails, Templates, choose "Confirm signup", "Reset password", "Invite user", "Magic link" or "Change email address", paste the file's HTML into the message body, set the subject from `config.toml`, and save.

Also on the cloud project, Authentication, URL Configuration: Site URL `https://azariabooks.com` and redirect URL `https://azariabooks.com/**`. Without them the links in these emails go to `localhost`.

Since 2026-11-23 people sign in without confirming first. On the cloud project: Authentication, Sign In / Providers, Email, turn off "Confirm email". Push migration `20261123000800_email_confirmation.sql` before deploying the app that holds the reminder; without it the reminder stays hidden and nothing breaks. The reminder's code travels in the "Magic link" email, so paste `magic_link.html` again (it now shows `{{ .Token }}`) and set its subject to "Your Azaria code". With the old template the email has only a link; tapping it also confirms.

Supabase's built-in sender allows only a few emails an hour and sends from a Supabase address. Connect your own sender under Authentication, Emails, SMTP Settings before inviting many people.

