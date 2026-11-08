#!/usr/bin/env node
/**
 * Uploads the auth emails in supabase/templates (confirm signup, password reset, sign-in link, invite, email change,
 * reauthentication) to the Supabase project, subjects included. Run from the repo root:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... pnpm supabase:emails
 *
 * The token is a personal access token from supabase.com/dashboard/account/tokens. The project comes from
 * NEXT_PUBLIC_SUPABASE_URL in .env.local (or SUPABASE_PROJECT_REF). Edit the emails in src/lib/email/auth-templates.ts,
 * not here.
 */
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!token || !ref) {
  console.error("Set SUPABASE_ACCESS_TOKEN (a personal access token) and run from the repo root so .env.local gives the project.");
  process.exit(1);
}

const subjects = JSON.parse(readFileSync("supabase/templates/subjects.json", "utf8"));
const body = {};
for (const kind of Object.keys(subjects)) {
  body[`mailer_subjects_${kind}`] = subjects[kind];
  body[`mailer_templates_${kind}_content`] = readFileSync(`supabase/templates/${kind}.html`, "utf8");
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Supabase said ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`Updated ${Object.keys(subjects).length} auth emails on ${ref}: ${Object.keys(subjects).join(", ")}.`);
