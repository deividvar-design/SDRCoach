# Deploying 100 Dials

Target: Vercel (Frankfurt) + Supabase (Ireland). Everything below is a one-time setup; after that, every push to `main` deploys.

## 1. Vercel project
1. Import the GitHub repo. Framework: Next.js. Root: repository root. Build command and output are the defaults.
2. Add the environment variables from `.env.example`. Public ones (`NEXT_PUBLIC_*`) can go in all environments; secrets only in Production and Preview.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL (custom domain). Preview deployments can leave it unset; auth redirects then fall back to the deployment origin.
4. `vercel.json` pins the region to `fra1` and schedules the daily lifecycle cron. Vercel injects `CRON_SECRET` as a Bearer header when you set that variable.

## 2. Supabase auth URLs
Authentication → URL configuration:
- Site URL: `https://<domain>`
- Redirect URLs: `https://<domain>/auth/callback`, `https://*.vercel.app/auth/callback` for previews.
Authentication → Email: enable "Confirm email". The signup gate relies on it.

## 3. Stripe
Statement descriptor: `100DIALS` (Settings → Business → Public details). The sandbox products created before the rename still say "SDRCoach"; rename them in the dashboard or re-run the setup script.
1. `STRIPE_SECRET_KEY=sk_test_… pnpm stripe:setup` creates products, prices and a portal configuration and prints the `STRIPE_PRICE_*` lines. Repeat with the live key when going live.
2. Developers → Webhooks → add endpoint `https://<domain>/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints a temporary signing secret.
4. Billing → Customer portal: set the configuration printed by the setup script as default.

## 4. ElevenLabs
1. `pnpm elevenlabs:setup` once; put the printed id in `ELEVENLABS_AGENT_ID`.
2. After pulling changes that touch the agent (turn timeout, gatekeeper voices, TTS model): `pnpm elevenlabs:update`. Re-runnable.
3. Optional: Conversational AI → Settings → Post-call webhook → `https://<domain>/api/webhooks/elevenlabs`; secret into `ELEVENLABS_WEBHOOK_SECRET`.

## 5. Resend
Verify the sending domain, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM`. Until then emails are logged and skipped, and invite links can be copied from the Team page.

## 6. Search indexing
`INDEXABLE` in `src/lib/site.ts` is false while `NEXT_PUBLIC_APP_URL` is a `*.vercel.app` host: every page is `noindex` and robots.txt disallows all, so the temporary address never gets indexed. Pointing `NEXT_PUBLIC_APP_URL` at the real domain flips it on. After that: submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools, and bump `SITE.contentUpdated` when marketing pages change materially.

## 7. Analytics
Create a PostHog project on the EU cloud; set `NEXT_PUBLIC_POSTHOG_KEY`. Nothing loads before cookie consent.

## 8. Error tracking
Create a Sentry project (platform Next.js, EU data region). Set `NEXT_PUBLIC_SENTRY_DSN` on Production and Preview. For readable stack traces also set `SENTRY_ORG`, `SENTRY_PROJECT` and a `SENTRY_AUTH_TOKEN` with the `project:releases` scope; the build uploads source maps only when the token is present. Tracing and session replay are off by design.

## Checks before the first customer
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` are green (CI runs them on every push).
- Make a real call end to end on a preview deployment and confirm the report scores.
- Run a test-mode checkout, confirm the org flips to the plan, then cancel from the portal and confirm the banner appears.
- Check `https://<domain>/sitemap.xml`, `/robots.txt` and the social preview on LinkedIn's post inspector.
