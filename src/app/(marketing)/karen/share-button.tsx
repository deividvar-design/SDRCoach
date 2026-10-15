"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies a ready-to-post line with the scorecard link. No share APIs, no trackers, just the clipboard. */
export function ShareButton({ path, survived, score }: { path: string; survived: string; score: number }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${path}`;
    const text = `I lasted ${survived} against Karen, the rudest AI prospect on the internet. Coach gave me ${score.toFixed(1)}/10. Your turn: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this:", text);
    }
  };
  return (
    <Button size="lg" variant="ghost" onClick={share}>
      <Share2 /> {copied ? "Copied, go post it" : "Share"}
    </Button>
  );
}
