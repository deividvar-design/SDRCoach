/**
 * Markup the prospect's text can carry: multi-voice tags such as <Receptionist>…</Receptionist> and v3 delivery
 * tags such as [sighs]. Safe to import from the browser; the server module re-exports it.
 */
export function stripVoiceTags(text: string) {
  return text
    .replace(/<\/?[A-Za-z][\w-]*>/g, "")
    .replace(/\[(?:sighs|exhales|laughs|clears throat|hesitant|impatient|whispers|curious|excited|sarcastic)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
