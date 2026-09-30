/** Only same-origin paths survive; anything that could leave the site falls back to the dashboard. */
export function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/")) return "/dashboard";
  try {
    const u = new URL(next, "http://100dials.local");
    if (u.origin !== "http://100dials.local") return "/dashboard";
    return `${u.pathname}${u.search}`;
  } catch {
    return "/dashboard";
  }
}
