"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Server pages hand this the message for a ?status=… redirect; it shows once on mount. */
export function StatusToast({ message, kind = "success" }: { message: string | null; kind?: "success" | "error" | "info" }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => (kind === "error" ? toast.error(message) : kind === "info" ? toast(message) : toast.success(message)), 50);
    return () => window.clearTimeout(id);
  }, [message, kind]);
  return null;
}
