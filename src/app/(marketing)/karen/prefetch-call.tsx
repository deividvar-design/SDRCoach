"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The call button ends on /karen/call; fetching that route's code now means the call screen is ready when Karen is. */
export function PrefetchCall() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/karen/call");
  }, [router]);
  return null;
}
