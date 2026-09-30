import "server-only";
import { cookies } from "next/headers";
import { formatDate } from "@/lib/utils";

/** The viewer's IANA timezone, set by a script in the root layout. Falls back to UTC on the first request. */
export async function viewerTimeZone() {
  const tz = (await cookies()).get("tz")?.value;
  return tz && /^[A-Za-z_]+\/[A-Za-z_\/+-]+$|^UTC$/.test(tz) ? tz : "UTC";
}

/** A date formatter bound to the viewer's timezone, so an evening call shows today's date, not tomorrow's. */
export async function dateFormatter() {
  const tz = await viewerTimeZone();
  return (value: string | Date) => formatDate(value, tz);
}
