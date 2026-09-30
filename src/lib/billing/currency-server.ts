import "server-only";
import { cookies, headers } from "next/headers";
import { currencyForCountry, isCurrency, type Currency } from "./currency";

export const CURRENCY_COOKIE = "currency";

/** The currency to show this visitor: their explicit choice if they made one, else by country. */
export async function viewerCurrency(): Promise<Currency> {
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (isCurrency(chosen)) return chosen;
  return currencyForCountry((await headers()).get("x-vercel-ip-country"));
}
