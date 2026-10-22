import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/demo/session";
import { DEMO_COOKIE_OPTIONS, startDemo } from "@/lib/demo/start";

/**
 * Where "Call Karen with Google" and homepage One Tap land after Google signs the person in: start the call with
 * their Google address and go straight to it. Someone who already has a workspace goes to it instead.
 */
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return to("/karen");

  const { data: membership } = await supabase.from("memberships").select("id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) return to("/dashboard");

  const result = await startDemo({ email: user.email, method: "google" });
  if ("waitlisted" in result) return to("/karen?busy=1");
  if ("error" in result) return to(`/karen?error=${encodeURIComponent(result.code)}`);
  const response = to("/karen/call");
  response.cookies.set(DEMO_COOKIE, result.id, DEMO_COOKIE_OPTIONS);
  return response;
}
