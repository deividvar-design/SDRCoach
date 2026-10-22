"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordOneTap } from "@/app/(auth)/actions";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleId {
  initialize(config: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
}
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleId } } };

/** A random nonce for Supabase and its SHA-256 for Google, so the ID token is bound to this page load. */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

function loadScript(): Promise<void> {
  const w = window as GoogleWindow;
  if (w.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-gsi]");
  return new Promise((resolve, reject) => {
    const el = existing ?? Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true });
    el.dataset.gsi = "1";
    el.addEventListener("load", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error("gsi failed to load")), { once: true });
    if (!existing) document.head.appendChild(el);
  });
}

/**
 * Google One Tap: the "Continue as …" prompt Chrome shows over the page. The ID token goes straight to Supabase
 * (signInWithIdToken), so it creates or signs in the same account the Google button does. Shown only to signed-out
 * visitors, on the homepage and the sign-in and sign-up pages, and off until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
 */
export function GoogleOneTap({ mode, next }: { mode: "login" | "signup" | "karen"; next: string }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || started.current) return;
    started.current = true;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session || cancelled) return;
      const [{ raw, hashed }] = await Promise.all([makeNonce(), loadScript()]);
      const id = (window as GoogleWindow).google?.accounts?.id;
      if (!id || cancelled) return;
      id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        context: mode === "login" ? "signin" : mode === "karen" ? "use" : "signup",
        use_fedcm_for_prompt: true,
        itp_support: true,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async ({ credential }: { credential: string }) => {
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
          if (error) {
            router.replace(`/login?error=google`);
            return;
          }
          await recordOneTap(mode).catch(() => {});
          window.location.assign(next);
        },
      });
      id.prompt();
    })().catch(() => {});

    return () => {
      cancelled = true;
      (window as GoogleWindow).google?.accounts?.id?.cancel();
    };
  }, [mode, next, router]);

  return null;
}
