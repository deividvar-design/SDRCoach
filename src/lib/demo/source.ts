/**
 * Where a Karen call came from. `?from=<path>` names the page that sent the caller and `?objection=<slug>` the
 * objection card they clicked. Neither changes the call: Karen does not take an objection yet. They ride along in
 * sessionStorage so they survive the Google sign-in redirect, and on the call row so the server can report the
 * scored result with them.
 */
export const KAREN_SOURCE_KEY = "karen_source";

export interface KarenSource {
  source_path: string | null;
  objection: string | null;
}

/** A site path: starts with one slash, no scheme, short. */
export function cleanSourcePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^\/(?!\/)[\w\-./?=&%]{0,200}$/.test(v) ? v : null;
}

/** An objection slug as the library names them. */
export function cleanObjection(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,60}$/.test(v) ? v : null;
}

/** The source from this tab, if the Karen page saw one. */
export function readKarenSource(): KarenSource {
  try {
    const raw = sessionStorage.getItem(KAREN_SOURCE_KEY);
    if (!raw) return { source_path: null, objection: null };
    const parsed = JSON.parse(raw) as Partial<KarenSource>;
    return { source_path: cleanSourcePath(parsed.source_path), objection: cleanObjection(parsed.objection) };
  } catch {
    return { source_path: null, objection: null };
  }
}

export function rememberKarenSource(source: KarenSource) {
  try {
    sessionStorage.setItem(KAREN_SOURCE_KEY, JSON.stringify(source));
  } catch {}
}

/** How the caller was signed in when the call was made, from the call's method. */
export function authMethod(method: string | null | undefined): "google" | "email" | "none" {
  return method === "google" ? "google" : method === "email" ? "email" : "none";
}
