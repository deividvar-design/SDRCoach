"use client";

import { useEffect } from "react";
import { rememberKarenSource } from "@/lib/demo/source";

/**
 * Keeps where this visitor came from for the call events. `?from=` wins; otherwise the referrer's path, so a link
 * from the objection library without the parameter still counts.
 */
export function RememberKarenSource({ from, objection }: { from: string | null; objection: string | null }) {
  useEffect(() => {
    let source_path = from;
    if (!source_path) {
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (ref) source_path = ref.origin === location.origin ? ref.pathname : `${ref.host}${ref.pathname}`;
      } catch {}
    }
    rememberKarenSource({ source_path: source_path ?? null, objection });
  }, [from, objection]);
  return null;
}
