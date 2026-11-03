import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined) }) }));

const KEY = "phc_test";
process.env.NEXT_PUBLIC_POSTHOG_KEY = KEY;
process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
delete process.env.SDRCOACH_DEMO;
const { analyticsIdentity, captureServer } = await import("./server");

describe("analyticsIdentity", () => {
  beforeEach(() => jar.clear());
  it("reads the distinct id and session from the posthog-js cookie", async () => {
    jar.set(`ph_${KEY}_posthog`, encodeURIComponent(JSON.stringify({ distinct_id: "0199-abc", $sesid: [1700000000000, "sess-1", 1700000000000] })));
    expect(await analyticsIdentity()).toEqual({ distinctId: "0199-abc", sessionId: "sess-1" });
  });
  it("is null without the cookie or with a broken one", async () => {
    expect(await analyticsIdentity()).toBeNull();
    jar.set(`ph_${KEY}_posthog`, "%7Bnot-json");
    expect(await analyticsIdentity()).toBeNull();
    jar.set(`ph_${KEY}_posthog`, encodeURIComponent(JSON.stringify({ $sesid: [1, "s", 1] })));
    expect(await analyticsIdentity()).toBeNull();
  });
});

describe("captureServer", () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("{}", { status: 200 });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts one event to the capture endpoint with the session and profile flag", async () => {
    await captureServer("0199-abc", "karen_call_completed", { score: 6.6, objection: "send-me-an-email" }, { sessionId: "sess-1" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(calls[0].body).toMatchObject({ api_key: KEY, event: "karen_call_completed", distinct_id: "0199-abc", properties: { score: 6.6, objection: "send-me-an-email", $session_id: "sess-1", $process_person_profile: false } });
    await captureServer("user-1", "signup_completed", { method: "google" }, { identified: true });
    expect(calls[1].body).toMatchObject({ distinct_id: "user-1", properties: { $process_person_profile: true } });
    expect(calls[1].body.properties).not.toHaveProperty("$session_id");
  });

  it("never throws when the analytics host is down", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ECONNREFUSED"); });
    await expect(captureServer("x", "y")).resolves.toBeUndefined();
  });
});
