# Deploying SDRCoach

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
1. `STRIPE_SECRET_KEY=sk_test_… pnpm stripe:setup` creates products, prices and a portal configuration and prints the `STRIPE_PRICE_*` lines. Repeat with the live key when going live.
2. Developers → Webhooks → add endpoint `https://<domain>/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints a temporary signing secret.
4. Billing → Customer portal: set the configuration printed by the setup script as default.

## 4. ElevenLabs
1. `pnpm elevenlabs:setup` once; put the printed id in `ELEVENLABS_AGENT_ID`.
2. Optional: Conversational AI → Settings → Post-call webhook → `https://<domain>/api/webhooks/elevenlabs`; secret into `ELEVENLABS_WEBHOOK_SECRET`.

## 5. Resend
Verify the sending domain, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM`. Until then emails are logged and skipped, and invite links can be copied from the Team page.

## 6. Analytics
Create a PostHog project on the EU cloud; set `NEXT_PUBLIC_POSTHOG_KEY`. Nothing loads before cookie consent.

## Checks before the first customer
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` are green (CI runs them on every push).
- Make a real call end to end on a preview deployment and confirm the report scores.
- Run a test-mode checkout, confirm the org flips to the plan, then cancel from the portal and confirm the banner appears.
- Check `https://<domain>/sitemap.xml`, `/robots.txt` and the social preview on LinkedIn's post inspector.
