"use client";

import Link from "next/link";
import { useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LevelSpec } from "@/lib/domain/levels";
import type { Difficulty } from "@/types/database";
import { Rays } from "@/components/shell/brand-panel";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface TargetOption {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string | null;
  kind: "real" | "practice" | "boss";
}

const GROUPS: { kind: TargetOption["kind"]; label: string }[] = [
  { kind: "real", label: "Real accounts" },
  { kind: "practice", label: "Practice personas" },
  { kind: "boss", label: "Boss fights" },
];

export function PracticeSetup({
  targets,
  levels,
  initialTargetId,
  initialDifficulty,
  blocked = false,
  blockedLabel = "No calls left this month",
}: {
  targets: TargetOption[];
  levels: LevelSpec[];
  initialTargetId: string;
  initialDifficulty: Difficulty;
  /** The workspace has no included calls left this month. */
  blocked?: boolean;
  blockedLabel?: string;
}) {
  const [targetId, setTargetId] = useState(initialTargetId);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const target = targets.find((t) => t.id === targetId) ?? targets[0]!;
  const boss = target.kind === "boss";
  const effective: Difficulty = boss ? "cold" : difficulty;

  const bosses = targets.filter((t) => t.kind === "boss");
  const level = levels.find((l) => l.id === effective);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 flex-[999_1_520px] space-y-7">
        <div>
          <Label htmlFor="target" className="text-sm font-semibold">Who are you calling?</Label>
          <Select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-2 h-[50px] rounded-[14px] bg-white px-4 text-[15px] dark:bg-card">
            {GROUPS.map((g) => {
              const items = targets.filter((t) => t.kind === g.kind);
              if (!items.length) return null;
              return (
                <optgroup key={g.kind} label={g.label}>
                  {items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}, {t.title}, {t.company}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
          <p className="text-muted-foreground mt-2 text-[13px]">
            {boss ? "Boss fight. Always Level 3, plus a personality. Nobody is expected to book this one. Stay composed, keep it short, and see how long you last." : <>Built from your target list. <Link href="/targets" className="text-foreground font-semibold hover:underline">Add a target</Link></>}
          </p>
        </div>

        <fieldset>
          <legend id="difficulty-label" className="text-sm font-semibold">How hard?</legend>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="difficulty-label">
            {levels.map((l) => {
              const on = effective === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={boss}
                  onClick={() => !boss && setDifficulty(l.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl p-[18px] text-left transition-colors",
                    on ? "border-primary border-2 bg-white dark:bg-card" : "bg-card hover:bg-accent/40 border",
                    boss ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span aria-hidden className="flex h-5 items-end gap-[3px]">
                      {[1, 2, 3].map((b) => <span key={b} className={cn("w-[5px] rounded-sm", b <= l.level ? "bg-signal-ink" : "bg-[#d8d1c2] dark:bg-white/15")} style={{ height: b * 6 }} />)}
                    </span>
                    <span className="text-muted-foreground text-xs">Level {l.level}</span>
                  </span>
                  <span className="text-[17px] font-semibold">{l.name}</span>
                  <span className="text-foreground/80 text-sm leading-snug">{l.tagline}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {bosses.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold">Or take on a boss fight</h2>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {bosses.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetId(t.id)}
                  aria-pressed={t.id === targetId}
                  className={cn("flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition-colors", t.id === targetId ? "border-primary border-2 bg-white dark:bg-card" : "bg-card hover:bg-accent/40 border")}
                >
                  <span aria-hidden className={cn("grid size-[38px] shrink-0 place-items-center rounded-full text-[13px] font-semibold text-[#f4f1ea]", ["bg-[#a35139]", "bg-[#2c3b4d]", "bg-[#1b2632]"][i % 3])}>
                    {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{t.name}</span>
                    <span className="text-muted-foreground block truncate text-[13px]">{t.title}, {t.company}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside aria-label="Dialing" className="brand-panel w-full flex-[1_1_340px] rounded-[22px] p-6 lg:max-w-[420px]">
        <Rays className="-right-[4%] -left-[4%]" height={200} />
        <p className="inline-flex items-center gap-2 text-[13px] text-[#b9c0cb]">
          <span aria-hidden className="live-pulse size-2 rounded-full bg-[#ffb162]" />
          {blocked ? blockedLabel : "Ready to dial"}
        </p>
        <p className="mt-3.5 text-[26px] font-semibold tracking-[-0.02em]">{target.name}</p>
        <p className="mt-1 text-sm text-[#b9c0cb]">{target.title}, {target.company} · {boss ? "Boss fight" : `Level ${level?.level}`}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-[#d9d4c9]">{boss ? "A deliberately hostile prospect. Level 3 resistance with a personality on top. Winning is possible, rare, and worth bragging about." : level?.description}</p>
        <form action="/practice/call" method="get" className="mt-5">
          <input type="hidden" name="target" value={targetId} />
          <input type="hidden" name="difficulty" value={effective} />
          <button type="submit" disabled={blocked} className="flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#ffb162] text-[17px] font-semibold text-[#1b2632] outline-none transition-[filter] hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-[#ffb162]/50 disabled:cursor-not-allowed disabled:opacity-60">
            <Phone className="size-[18px]" strokeWidth={2.2} /> {blocked ? blockedLabel : "Dial"}
          </button>
        </form>
        <p className="mt-3.5 mb-24 text-center text-[13px] text-[#b9c0cb]">Headset recommended. The call is recorded so the coach can score it.</p>
      </aside>
    </div>
  );
}
