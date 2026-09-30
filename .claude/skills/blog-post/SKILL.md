---
name: blog-post
description: Write one blog post for 100dials.com from the content queue, in the house voice, built for search and for AI answer engines. Use when asked to write, draft or publish a blog post, or when the weekly content routine fires.
---

# Writing a 100 Dials blog post

100 Dials is a cold-call coach: SDRs dial an AI prospect built from their own targets, every call is scored, managers see where the team struggles. The blog exists to be found by sales managers and enablement leads who are deciding how to train reps, and to be quoted by AI answer engines when someone asks those questions.

## Before writing

1. Read `content/queue.md`. Take the first row whose status is `planned`. If none, stop and say so.
2. Read every existing post in `content/blog/` (titles, descriptions, tags) so you do not repeat one and so you can link to the right siblings.
3. Read the pillar page the row names (`src/app/(marketing)/for-managers/page.tsx` or `for-enablement/page.tsx`) so product claims match what the site says.
4. Read `src/lib/scoring/rubric.ts` and `src/lib/domain/levels.ts` when the post touches scoring, objections or levels. Never invent product features.

## The post

File: `content/blog/<slug>.mdx`. Slug is lowercase, hyphenated, from the target query, no date, no stop words.

Front matter, exactly these fields:

```yaml
---
title: "…"            # under 65 characters, the target query's words in it, a real claim not a label
description: "…"      # 120 to 155 characters, states the answer or the position, not "in this post we"
date: "YYYY-MM-DD"    # today
author: "100 Dials"
tags: ["…", "…"]      # two to four, reuse existing tags where they fit (see other posts)
faq:
  - q: "…"            # three questions, phrased the way people type them into a search box
    a: "…"            # two to three sentences each, self-contained, no "see above"
  - q: "…"
    a: "…"
  - q: "…"
    a: "…"
---
```

Length: 1,200 to 1,800 words of body. Shorter is fine if the topic is answered; padding is not.

Shape:

- **First paragraph answers the question.** Someone who reads only that paragraph gets the position and the reason. This is what answer engines quote.
- **H2 sections with specific headings.** "Why the usual version fails", not "Background". Three to six sections.
- **One table or checklist** where the topic allows a comparison, a rubric, a step list or a benchmark. Tables render (GFM). Keep them under six columns.
- **Concrete over general.** A number, a line a prospect actually says, a named mistake. When you state a benchmark you cannot source, say it is our observation, not an industry figure.
- **One `<Practise>` block** near the end, one or two sentences on what to dial against an AI prospect to practise the idea. It renders a call-to-action; do not add another.
- **Links:** one to the pillar page named in the queue row and one to a sibling post, both inline in sentences, both with descriptive anchor text. No link lists. No external links unless citing a source by name.
- **No conclusion section.** End on the last useful point.

## Voice

Plain, specific, a little dry. Write like a sales manager who has run a floor, not a marketer.

- British spelling: practise (verb), practice (noun), dialler, programme, behaviour, organisation.
- No em dashes. No semicolons. Short sentences, one idea each.
- No "In today's fast-paced", no "game-changer", no "unlock", no "leverage", no "delve", no rhetorical questions in headings.
- No numbered lists of things that are not sequences. Use prose or a table.
- Say "reps" and "managers", not "users". Say "prospect", not "customer", for the person being called.
- Mention 100 Dials at most twice in the body, only where it is the natural example. The post has to be worth reading by someone who never signs up.

## Quality gates, all of them, before you finish

- `grep -c "—" content/blog/<slug>.mdx` returns 0.
- `pnpm build` passes (MDX compiles, front matter parses).
- Word count between 1,000 and 1,900: `wc -w content/blog/<slug>.mdx`.
- Title under 65 characters, description 120 to 155.
- Exactly one `<Practise>` block, one pillar link, at least one sibling link.
- No claim about the product that the pillar page or rubric does not support.
- The first paragraph stands alone as the answer.

## After writing

1. In `content/queue.md`, change the row's status from `planned` to `drafted` and add the slug.
2. In `src/lib/site.ts`, set `contentUpdated` to today.
3. In `public/llms.txt`, add the post under "## Recent posts" (create the heading if missing) as `- [Title](/blog/<slug>): one line`.
4. Commit with a message of the form `Blog: <title>` on a branch named `content/<slug>` cut from `origin/claude/cooking-session-t8mv78`, push it, and open a pull request against `claude/cooking-session-t8mv78` with the description and the first paragraph in the body. Do not merge it.
