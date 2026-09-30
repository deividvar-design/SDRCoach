/** Currencies the app prices in. Stripe prices carry both; the buyer's country picks the default. */
export type Currency = "usd" | "eur";

export const CURRENCIES: Currency[] = ["usd", "eur"];

/** Countries that see euros first: the EU, plus neighbours who would rather pay in euros than dollars. */
const EUR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "GB", "NO", "CH", "IS", "LI", "UA", "MD", "RS", "BA", "ME", "MK", "AL", "XK", "AD", "MC", "SM", "VA",
]);

export function currencyForCountry(country: string | null | undefined): Currency {
  return country && EUR_COUNTRIES.has(country.toUpperCase()) ? "eur" : "usd";
}

export function isCurrency(v: unknown): v is Currency {
  return v === "usd" || v === "eur";
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { usd: "$", eur: "€" };

export function formatMoney(amount: number, currency: Currency) {
  const whole = Number.isInteger(amount) ? amount.toLocaleString("en-GB") : amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${CURRENCY_SYMBOL[currency]}${whole}`;
}
