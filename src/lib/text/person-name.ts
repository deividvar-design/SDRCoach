/**
 * A person's or company's name as typed by a user, made safe to drop into a prompt or an email we send. Names are
 * free text that the owner can also set straight through the API, so every place that reuses one goes through here:
 * one line, no markup, no links, a sensible length.
 */
const LINK = /(https?:\/\/|www\.)\S*|\b[a-z0-9-]+\.(com|net|org|io|co|ai|app|xyz|info|biz|me|ly|ru|cn|top|link|site|dev|uk|de)\b\S*/gi;

export function safeName(raw: string | null | undefined, fallback: string, max = 80) {
  const cleaned = (raw ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>{}`]/g, "")
    .replace(LINK, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max)
    .trim();
  return cleaned || fallback;
}
