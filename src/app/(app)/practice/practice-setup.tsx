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
}

export function PracticeSetup({
  targets,
  levels,
  initialTargetId,
  initialDifficulty,
  assignmentId,
}: {
  targets: TargetOption[];
  levels: LevelSpec[];
  initialTargetId: string;
  initialDifficulty: Difficulty;
  assignmentId: string | null;
}) {
  const [targetId, setTargetId] = useState(initialTargetId);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const target = targets.find((t) => t.id === targetId) ?? targets[0]!;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="target">Who are you calling?</Label>
          <Select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.title}, {t.company}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-3">
          <Label id="difficulty-label">How hard?</Label>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="difficulty-label">
            {levels.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={difficulty === l.id}
                onClick={() => setDifficulty(l.id)}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 text-left transition-colors",
                  difficulty === l.id ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/40",
                )}
              >
                <div className="text-muted-foreground font-mono text-xs">LEVEL {l.level}</div>
                <div className="mt-1 font-medium">{l.name}</div>
                <div className="text-muted-foreground mt-1 text-xs">{l.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="bg-card h-fit space-y-5 rounded-xl border p-5">
        <div>
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Dialing</div>
          <div className="mt-1 text-lg font-medium">{target.name}</div>
          <div className="text-muted-foreground text-sm">{target.title}, {target.company}</div>
        </div>
        <p className="text-muted-foreground text-sm">{levels.find((l) => l.id === difficulty)?.description}</p>
        <form action="/practice/call" method="get">
          <input type="hidden" name="target" value={targetId} />
          <input type="hidden" name="difficulty" value={difficulty} />
          {assignmentId && <input type="hidden" name="assignment" value={assignmentId} />}
          <Button type="submit" size="lg" className="w-full">
            <Phone /> Dial
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-xs">Headset recommended. You’ll be recorded.</p>
      </aside>
    </div>
  );
}
