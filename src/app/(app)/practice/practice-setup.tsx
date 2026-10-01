"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LevelSpec } from "@/lib/domain/levels";
import type { Difficulty } from "@/types/database";
import { Button } from "@/components/ui/button";
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
}: {
  targets: TargetOption[];
  levels: LevelSpec[];
  initialTargetId: string;
  initialDifficulty: Difficulty;
  /** The workspace has no included calls left this month. */
  blocked?: boolean;
}) {
  const [targetId, setTargetId] = useState(initialTargetId);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const target = targets.find((t) => t.id === targetId) ?? targets[0]!;
  const boss = target.kind === "boss";
  const effective: Difficulty = boss ? "cold" : difficulty;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="target">Who are you calling?</Label>
          <Select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
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
          {boss && (
            <p className="text-signal text-xs">
              Boss fight. Always Level 3, plus a personality. Nobody is expected to book this one. Stay composed, keep it short, and see how long you last.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label id="difficulty-label">How hard?</Label>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="difficulty-label">
            {levels.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={effective === l.id}
                aria-disabled={boss}
                onClick={() => !boss && setDifficulty(l.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  effective === l.id ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/40",
                  boss ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                )}
              >
                <div className="text-muted-foreground font-mono text-xs">Level {l.level}</div>
                <div className="mt-1 font-medium">{l.name}</div>
                <div className="text-muted-foreground mt-1 text-xs">{l.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="bg-card h-fit space-y-5 rounded-xl border p-5">
        <div>
          <div className="text-muted-foreground text-xs">Dialing</div>
          <div className="mt-1 text-lg font-medium">{target.name}</div>
          <div className="text-muted-foreground text-sm">{target.title}, {target.company}</div>
        </div>
        <p className="text-muted-foreground text-sm">{boss ? "A deliberately hostile prospect. Level 3 resistance with a personality on top. Winning is possible, rare, and worth bragging about." : levels.find((l) => l.id === effective)?.description}</p>
        <form action="/practice/call" method="get">
          <input type="hidden" name="target" value={targetId} />
          <input type="hidden" name="difficulty" value={effective} />
          <Button type="submit" size="lg" className="w-full" disabled={blocked}>
            <Phone /> {blocked ? "No calls left this month" : "Dial"}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-xs">Headset recommended.</p>
      </aside>
    </div>
  );
}
