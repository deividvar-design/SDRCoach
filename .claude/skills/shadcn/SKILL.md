---
name: shadcn
description: How UI primitives are built and used in this repo (shadcn/ui conventions on Radix, Tailwind v4, cva). Use when adding or changing anything under src/components/ui, when a page needs a component the kit lacks (sheet, popover, tooltip, checkbox, switch, command palette, toast variants), or when styling forms, tables, dialogs and menus so they match the rest of the app.
---

# shadcn/ui conventions for 100 Dials

The kit in `src/components/ui` is hand-written in the shadcn/ui style. There is no `components.json`
and the shadcn registry is not reachable from CI, so **never run `npx shadcn add`**. Write the
component the way shadcn would, adapted to this repo's tokens.

## Building blocks

- **Primitives:** `import { Dialog, DropdownMenu, Slot, ... } from "radix-ui"` (the single
  `radix-ui` package, not `@radix-ui/react-*`). Unstyled behaviour and accessibility come from Radix;
  we only add classes.
- **Variants:** `cva` from `class-variance-authority` with a `VariantProps` type, exactly as in
  `button.tsx`. Every variant map needs `defaultVariants`.
- **Class merging:** `cn()` from `@/lib/utils` (clsx + tailwind-merge). Always spread `className`
  last so callers can override.
- **Composition:** support `asChild` through `Slot` on anything that renders a clickable element, so
  a `<Button asChild><Link/></Button>` keeps the link semantics.
- **Icons:** `lucide-react`. Buttons size icons via `[&_svg:not([class*='size-'])]:size-4`; do not
  set icon sizes at call sites unless overriding.
- **Data attributes:** add `data-slot="<name>"` on the root of each part (shadcn v4 style) so
  styles and tests can target parts without extra classes.

## Tokens, not colours

Colours come only from the tokens in `src/app/globals.css`: `background`, `foreground`, `card`,
`muted`, `muted-foreground`, `accent`, `primary`, `secondary`, `destructive`, `border`, `ring`,
`success`, `warning`, `sidebar`, and the one accent `signal` (live states only). Never write a raw
hex or oklch value in a component. Light and dark are both defined in `globals.css`; a component
that looks right in one must be checked in the other (`ThemeToggle` in the user menu).

Typography: `font-display` (Instrument Serif) for headlines and hero numbers, default sans (Geist)
for UI, `font-mono` for eyebrow labels, timestamps and tabular numbers (`tabular`). Eyebrows are
`font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground`.

Radius: cards `rounded-2xl`, inputs and buttons `rounded-md`, pills `rounded-full`. Borders are the
`border` token at 1px; shadows only `shadow-xs` on controls.

## Adding a component the kit lacks

1. Check `src/components/ui` first; reuse before adding.
2. Create `src/components/ui/<name>.tsx`, one file per component family, exporting named parts
   (`Sheet`, `SheetTrigger`, `SheetContent`, ...), each a thin wrapper over the Radix part with
   `cn()` and `data-slot`.
3. Match shadcn's default classes as closely as memory allows, then replace its colour classes with
   this repo's tokens. Keep focus rings: `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.
4. Animations: Radix state attributes with `data-[state=open]:animate-in data-[state=closed]:animate-out`
   only if `tw-animate-css` is present in `globals.css`; otherwise keep transitions to `transition-colors`.
5. Run `pnpm lint` and `pnpm typecheck`; the ESLint config flags ref reads and impure calls in render.

## Forms and mutations

Server Components fetch; mutations are Server Actions in the sibling `actions.ts` used through
`useActionState` (see `src/app/(app)/settings/settings-forms.tsx`). Inputs use `Label` + `Input` /
`Textarea` / `Select` from the kit with matching `id`/`htmlFor`. Success feedback is a `sonner`
toast from `toast.success(...)`; errors render inline as `text-destructive text-sm`. Buttons show a
pending label (`{pending ? "Saving…" : "Save"}`) and are `disabled` while pending.

## Tables and lists

Tables use `Table*` from the kit, wrapped in `<div className="overflow-x-auto">` inside a
`bg-card rounded-xl border`. Numbers right-aligned with `tabular`. Scores go through `ScorePill`;
statuses through the labels in `src/lib/domain/session-status.ts`. Empty states use
`EmptyState` from `src/components/shell/empty-state.tsx`, never a bare paragraph.

## Accessibility floor

Every interactive element has an accessible name (visible text or `aria-label`); groups of
exclusive choices are `role="radiogroup"` with `role="radio"` and `aria-checked`; dialogs have a
title; anything that opens on hover also opens on focus. Do not rely on colour alone for meaning.
