# SDRCoach

AI cold-call training for SDR teams. Reps dial realistic AI prospects built from their own targets and get coached on every call. Managers track the team.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase, ElevenLabs, Anthropic keys
pnpm dev
```

Apply `supabase/migrations/*.sql` to your Supabase project (dashboard SQL editor or `supabase db push`).

See `docs/ARCHITECTURE.md` for how the pieces fit.
