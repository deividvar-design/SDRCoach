/** The one question on the signup form. Stored on the profile, shown in admin and in the stalled-trial alert. */
export const SIGNUP_REASONS = [
  { id: "ramping", label: "Ramping new SDRs" },
  { id: "objections", label: "My team freezes on objections" },
  { id: "evaluating", label: "Evaluating roleplay tools" },
  { id: "karen", label: "Just want to fight Karen" },
] as const;

export type SignupReason = (typeof SIGNUP_REASONS)[number]["id"];

export function reasonLabel(id: string | null | undefined) {
  return SIGNUP_REASONS.find((r) => r.id === id)?.label ?? null;
}

/** Shown only once the outbound Karen call exists. Until then the number is never asked for. */
export const CALLBACK_ENABLED = process.env.NEXT_PUBLIC_KAREN_CALLBACK === "1";

/** Dial codes for the callback field. Short on purpose; the number is typed in national format. */
export const DIAL_CODES = [
  ["US", "+1"], ["GB", "+44"], ["DE", "+49"], ["FR", "+33"], ["NL", "+31"], ["IE", "+353"], ["ES", "+34"], ["IT", "+39"], ["PT", "+351"], ["BE", "+32"],
  ["SE", "+46"], ["DK", "+45"], ["NO", "+47"], ["FI", "+358"], ["PL", "+48"], ["LT", "+370"], ["LV", "+371"], ["EE", "+372"], ["CZ", "+420"], ["AT", "+43"],
  ["CH", "+41"], ["CA", "+1"], ["AU", "+61"], ["NZ", "+64"], ["IL", "+972"], ["AE", "+971"], ["SG", "+65"], ["IN", "+91"], ["BR", "+55"], ["MX", "+52"],
] as const;

/** E.164: a plus, then 7 to 15 digits, no leading zero. */
export function toE164(dialCode: string, national: string): string | null {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const code = dialCode.replace(/\D/g, "");
  const full = `+${code}${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(full) ? full : null;
}
