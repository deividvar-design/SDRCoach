---
name: objection-page
description: Add or refresh a page in the 100dials.com objection library (content/objections). Use when a new objection kind is added to the rubric, when asked to refresh the objection pages, or when the quarterly objection-library routine fires.
---

# Objection library pages

One page per key in `OBJECTIONS` in `src/lib/scoring/rubric.ts`, except `other`. Files live in `content/objections/<slug>.mdx` and are rendered by `src/app/(marketing)/objections/[slug]/page.tsx`. The index at `/objections` lists them in rubric order.

## When the routine fires

1. Compare the rubric keys with the files in `content/objections/`. For any key without a page (other than `other`), write one following the spec below.
2. For existing pages, re-read each one against its rubric `coaching` line. If the position drifted, fix the first paragraph. Refresh the exchange if it reads stale. Do not rewrite pages that are fine; set `updated` only on pages you changed.
3. Keep `public/llms.txt`'s "## Objection library" list in sync with the files.
4. Follow the "After writing" steps in `.claude/skills/blog-post/SKILL.md` for branch, commit and pull request, using a branch named `content/objections-<YYYY-MM>`.

## Page spec

Slug: the objection as people type it, lowercase and hyphenated, for example `send-me-an-email`, `not-the-decision-maker`.

Front matter, exactly these fields:

```yaml
---
kind: send_email                   # the rubric key
title: "…"                         # under 65 characters, "<objection>: how to handle it on a cold call"
description: "…"                   # 120 to 155 characters, states the answer
phrasings: ["…", "…", "…", "…"]    # four to six things prospects say, verbatim, as sentences
related: ["slug", "slug", "slug"]  # three other objection slugs
updated: "YYYY-MM-DD"
faq:                               # three, phrased as search queries, two to three sentence answers
  - q: "…"
    a: "…"
---
```

Body, 700 to 1,000 words, with these exact H2 headings in this order:

- Opening paragraph with no heading: the answer in three or four sentences, agreeing with the rubric's coaching line.
- `## What they actually mean`
- `## Three ways to handle it` with three H3 moves, each with a one to three line script in a blockquote, each line under 25 words.
- `## An exchange that works`: five to eight alternating `**Prospect:**` / `**Rep:**` blockquote lines ending in a concrete next step, then one paragraph on which skill a coach would score well.
- `## The mistakes that lose the call`: prose or a "What reps say | Why it fails" table.
- `## Say this, not that`: an "Instead of | Say" table, three or four rows.
- Exactly one `<Practise>` block last, naming a real level from `src/lib/domain/levels.ts`.

Links: one inline link to a sibling objection page and one to `/blog/common-cold-call-objections`.

## Voice and gates

Same as the blog skill: British spelling, no em dashes, no semicolons, no marketing words, 100 Dials named at most once per body, no invented statistics or real names. Before finishing: `grep -c "—"` is 0 on every file, `pnpm build` passes, each body is 700 to 1,000 words, title under 65 and description 120 to 155 characters.
