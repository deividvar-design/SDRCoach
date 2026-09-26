@AGENTS.md

# SDRCoach

B2B SaaS: SDRs practise cold calls against an AI prospect (ElevenLabs voice), get scored by Claude, managers track the team.

## Stack
- Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4, Radix primitives in `src/components/ui`
- Supabase: auth, Postgres with RLS, storage. Schema lives in `supabase/migrations`, types in `src/types/database.ts` (keep in sync)
- ElevenLabs Conversational AI for the live call; Anthropic SDK for persona grounding and scoring
- pnpm

## Conventions
- Server Components fetch data; mutations are Server Actions in a sibling `actions.ts` using `useActionState`
- `requireViewer()` / `requireManager()` in `src/lib/auth.ts` gate every app page. RLS is the real boundary; server checks are UX
- Roles: `owner` > `manager` > `rep`. Reps see only their own calls. Managers see the org
- Difficulty levels are defined once in `src/lib/domain/levels.ts`
- Read `docs/ARCHITECTURE.md` before touching the call or scoring pipeline

## Commands
- `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`
