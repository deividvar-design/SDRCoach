import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/rewards/referral";

/** A referral link: remember the code for 90 days and show the homepage. Unknown codes are harmless; they are checked at signup. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const response = NextResponse.redirect(new URL("/?ref=" + encodeURIComponent(code), request.url), { status: 307 });
  if (/^[a-z0-9]{6,12}$/.test(code)) response.cookies.set(REFERRAL_COOKIE, code, { path: "/", maxAge: 90 * 86_400, sameSite: "lax" });
  return response;
}
