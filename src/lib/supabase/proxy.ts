import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAppPath } from "@/lib/routes";
import { CONSENT_REGION_COOKIE, consentRequiredFor } from "@/lib/consent-region";

/** Tells the browser whether this visitor's country requires consent before non-essential cookies. Set once. */
function stampRegion(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(CONSENT_REGION_COOKIE)) return response;
  const country = request.headers.get("x-vercel-ip-country");
  response.cookies.set(CONSENT_REGION_COOKIE, consentRequiredFor(country) ? "eea" : "row", { path: "/", maxAge: 180 * 86_400, sameSite: "lax" });
  return response;
}

/**
 * Refreshes the Supabase session cookie, sends signed-out visitors of app paths to sign in, and sends signed-in
 * visitors of the auth pages to the dashboard. Any other path is left alone, so an unknown URL is a real 404.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (process.env.SDRCOACH_DEMO === "1" && !process.env.VERCEL) return stampRegion(request, response);

  const { pathname } = request.nextUrl;
  // No session cookie and nothing to protect: skip the auth round trip so public pages stay fast and cacheable.
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSessionCookie && !isAppPath(pathname)) return stampRegion(request, response);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add logic between createServerClient and getUser: it can cause random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return stampRegion(request, response);
}
