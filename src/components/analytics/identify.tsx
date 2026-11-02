"use client";

import { useEffect } from "react";
import { setIdentity } from "./provider";

/** Ties this browser's analytics to the signed-in person and their workspace. Applies once analytics has consent. */
export function IdentifyUser({ userId, props }: { userId: string; props: Record<string, unknown> }) {
  const key = JSON.stringify(props);
  useEffect(() => {
    setIdentity(userId, JSON.parse(key) as Record<string, unknown>);
  }, [userId, key]);
  return null;
}

/** Fires one product event when the screen it sits on renders, once per mount. */
export function TrackOnMount({ event, props }: { event: string; props?: Record<string, unknown> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    import("./provider").then(({ track }) => track(event, JSON.parse(key) as Record<string, unknown>));
  }, [event, key]);
  return null;
}
