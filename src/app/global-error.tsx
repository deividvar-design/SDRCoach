"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last-resort boundary: only renders when the root layout itself fails, so it carries its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#eee9df", color: "#1b2632", margin: 0, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>Something broke on our side.</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>Your calls and scores are safe. Try again in a moment.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.6 }}>ref {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 24, padding: "10px 18px", borderRadius: 999, border: "1px solid #1b2632", background: "#1b2632", color: "#eee9df", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
