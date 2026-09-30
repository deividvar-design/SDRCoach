"use client";

import { useState, useTransition } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { acknowledgeRecording } from "./actions";

/** Shown once, before a rep's first call. What is captured, who sees it, and that they agree. */
export function RecordingNotice({ teamSees }: { teamSees: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, start] = useTransition();

  return (
    <section className="bg-card paper-grain enter max-w-2xl rounded-2xl border p-6 md:p-8">
      <div className="bg-signal/10 text-signal grid size-10 place-items-center rounded-full">
        <Mic className="size-5" />
      </div>
      <h2 className="font-display mt-4 text-2xl">Before your first call</h2>
      <p className="text-muted-foreground mt-2 text-sm">Three things to know, then you dial.</p>
      <ul className="mt-5 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="bg-foreground mt-2 size-1.5 shrink-0 rounded-full" />
          <span>Every practice call is <strong>recorded and transcribed</strong>. That is how the prospect hears you and how the coach scores you.</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-foreground mt-2 size-1.5 shrink-0 rounded-full" />
          <span>Your managers can listen to the recording and read the transcript and score.{teamSees && " Teammates can see your scores and transcripts too, because your workspace shares results."}</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-foreground mt-2 size-1.5 shrink-0 rounded-full" />
          <span>The prospect is an AI, not a person. Nothing you say leaves your workspace or trains a model. A manager can delete a call for you if you need one gone.</span>
        </li>
      </ul>
      <div className="mt-6 flex items-start gap-3">
        <Checkbox id="recording-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
        <Label htmlFor="recording-agree" className="cursor-pointer text-sm leading-snug font-normal">
          I understand my calls are recorded and shared with my workspace as described.
        </Label>
      </div>
      <Button size="lg" className="mt-6" disabled={!agreed || busy} onClick={() => start(() => acknowledgeRecording())}>
        Continue to the call
      </Button>
    </section>
  );
}
