import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTH_EMAILS } from "./auth-templates";

// The files `pnpm supabase:emails` uploads. Regenerate after a change with UPDATE_AUTH_EMAILS=1 pnpm vitest run auth-templates
const dir = join(process.cwd(), "supabase/templates");

describe("Supabase auth emails", () => {
  if (process.env.UPDATE_AUTH_EMAILS === "1") {
    mkdirSync(dir, { recursive: true });
    const subjects: Record<string, string> = {};
    for (const [kind, t] of Object.entries(AUTH_EMAILS)) {
      writeFileSync(join(dir, `${kind}.html`), t.html);
      subjects[kind] = t.subject;
    }
    writeFileSync(join(dir, "subjects.json"), `${JSON.stringify(subjects, null, 2)}\n`);
  }

  for (const [kind, t] of Object.entries(AUTH_EMAILS)) {
    it(`${kind}: the committed file matches the template`, () => {
      const file = join(dir, `${kind}.html`);
      expect(existsSync(file), `missing ${file}, run with UPDATE_AUTH_EMAILS=1`).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(t.html);
      expect(JSON.parse(readFileSync(join(dir, "subjects.json"), "utf8"))[kind]).toBe(t.subject);
    });
    it(`${kind}: carries the link or code Supabase fills in`, () => {
      expect(t.html).toContain(kind === "reauthentication" ? "{{ .Token }}" : 'href="{{ .ConfirmationURL }}"');
    });
  }
});
