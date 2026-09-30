import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Throws on purpose so an admin can confirm errors reach Sentry. Non-admins get the usual 404. */
export async function GET() {
  const viewer = await requireAdmin();
  throw new Error(`Sentry test from ${viewer.email} at ${new Date().toISOString()}`);
}
