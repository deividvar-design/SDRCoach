import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { ipBucket } = await import("./session");

describe("ipBucket", () => {
  it("keeps IPv4 as it is, including when wrapped in IPv6", () => {
    expect(ipBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(ipBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });
  it("counts every address in an IPv6 /64 as one visitor", () => {
    const a = ipBucket("2a02:1234:5678:9abc:1111:2222:3333:4444");
    expect(a).toBe("2a02:1234:5678:9abc::/64");
    expect(ipBucket("2a02:1234:5678:9abc:ffff:0:0:1")).toBe(a);
    expect(ipBucket("2a02:1234:5678:9abc::1")).toBe(a);
    expect(ipBucket("2a02:1234:5678:9abd::1")).not.toBe(a);
    expect(ipBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });
  it("passes through nothing and oddities", () => {
    expect(ipBucket(null)).toBeNull();
    expect(ipBucket("not-an-ip")).toBe("not-an-ip");
  });
});
