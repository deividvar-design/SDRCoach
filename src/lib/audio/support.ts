"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this browser can play a voice call at all. iOS Lockdown Mode removes Web Audio from every browser on the
 * phone, and the voice SDK then throws on the first tap. Checked before dialling, so nobody spends a call on it.
 */
export function webAudioSupported() {
  if (typeof window === "undefined") return true;
  return "AudioContext" in window || "webkitAudioContext" in window;
}

const noop = () => () => {};

/** Server render assumes audio works; the client corrects it on hydration without a mismatch. */
export function useWebAudioSupported() {
  return useSyncExternalStore(noop, webAudioSupported, () => true);
}

export const NO_WEB_AUDIO_MESSAGE = "This browser has website sound switched off, so you could not hear the prospect. On an iPhone that is usually Lockdown Mode. Use a laptop or another phone.";
