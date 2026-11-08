/**
 * The sales call. One link, shown only where a buyer already shows intent (pricing, enterprise, the manager and
 * training pages, founding partners, approved trial extensions), never on the Karen or hero paths. Calendly records
 * the utm values with each booking, so its report says which placement booked the call.
 */
export const BOOKING_URL = "https://calendly.com/david-100dials/30min";

export function bookingUrl(placement: string, medium: "site" | "email" = "site") {
  const q = new URLSearchParams({ utm_source: "100dials", utm_medium: medium, utm_campaign: placement });
  return `${BOOKING_URL}?${q}`;
}
