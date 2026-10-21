/** Where consent is required before any non-essential storage: the EEA, the UK and Switzerland. */
export const CONSENT_REGION_COOKIE = "cr";

const EEA_UK_CH = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH"]);

/** Unknown countries are treated as requiring consent, so a missing header never loosens the default. */
export function consentRequiredFor(country: string | null | undefined) {
  return !country || EEA_UK_CH.has(country.toUpperCase());
}
