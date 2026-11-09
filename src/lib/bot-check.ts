/**
 * Spots form submissions from bots that push other people's addresses through sign-up and password reset, so the
 * site does not send those people email they never asked for.
 *
 * Two signs, either one enough:
 *  - the hidden "url_confirm" field is filled in. People never see it; form-filling bots fill every field.
 *  - the name is one long run of letters in mixed case with no spaces ("pdsJMSEGgEQOczszGvaqNQx"). Real full names
 *    have a space, and single-word names are short or capitalised once.
 */
export const HONEYPOT_FIELD = "url_confirm";

export function looksRandomName(name: string | null | undefined) {
  const n = (name ?? "").trim();
  if (!/^[A-Za-z]{15,}$/.test(n)) return false;
  const innerCaps = (n.slice(1).match(/[A-Z]/g) ?? []).length;
  return /[a-z]/.test(n) && innerCaps >= 3;
}

export function looksLikeBot(formData: FormData) {
  const trap = formData.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return "honeypot";
  const name = formData.get("full_name");
  if (typeof name === "string" && looksRandomName(name)) return "random_name";
  return null;
}
