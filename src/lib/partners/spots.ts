import "server-only";
import { unstable_cache } from "next/cache";
import { spotsLeft } from "./program";

export const SPOTS_TAG = "partner-spots";

/**
 * The spots-left count for the site-wide bar, cached so the static marketing pages stay static. Refreshed every ten
 * minutes and whenever an application is decided. Null when the database cannot be reached, and the bar then shows
 * no number rather than a wrong one.
 */
export const cachedSpotsLeft = unstable_cache(
  async (): Promise<number | null> => {
    try {
      return await spotsLeft();
    } catch {
      return null;
    }
  },
  [SPOTS_TAG],
  { revalidate: 600, tags: [SPOTS_TAG] },
);
