/** Paths that need a signed-in user. Everything else is public, and an unknown path is a 404, not a sign-in redirect. */
export const APP_PATHS = ["/admin", "/dashboard", "/targets", "/sessions", "/team", "/knowledge", "/settings", "/practice", "/upgrade", "/onboarding", "/api/calls", "/api/export", "/api/admin"];

/** Paths hidden from crawlers: the app itself plus the auth and invite flows. */
export const NOINDEX_PATHS = [...APP_PATHS, "/api/", "/invite/", "/auth/", "/login", "/signup", "/forgot-password", "/reset-password"];

export function isAppPath(pathname: string) {
  return APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
