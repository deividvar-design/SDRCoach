/**
 * House style: no em dashes or en dashes in anything a person reads. The site's own copy is checked by
 * dashes.test.ts; this cleans what the models write before it is stored or shown.
 */
const RANGE = /(\d)\s*[\u2013\u2014]\s*(\$?\d)/g;
const SPACED = /\s+[\u2013\u2014]\s+/g;
const BARE = /[\u2013\u2014]/g;

/** "30\u201350" reads "30 to 50"; a dash between words becomes a comma. */
export function noLongDashes(s: string): string {
  return s.replace(RANGE, "$1 to $2").replace(SPACED, ", ").replace(BARE, ", ");
}

/** The same, through every string in a parsed model response. */
export function withoutLongDashes<T>(value: T): T {
  if (typeof value === "string") return noLongDashes(value) as T;
  if (Array.isArray(value)) return value.map((v) => withoutLongDashes(v)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutLongDashes(v)])) as T;
  return value;
}

/** One line for the prompts, so the models write it that way in the first place. */
export const NO_DASHES_RULE = "Never use em dashes or en dashes. Use a comma, a colon or a full stop instead, and write number ranges with \"to\".";
