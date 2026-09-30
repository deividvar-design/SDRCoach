"use client";

import { useState, useTransition } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { acknowledgeRecording } from "./actions";

/** Shown once, as a modal over the practice page before a rep's first call. It only closes on agreement. */
export function RecordingNotice({ teamSees }: { teamSees: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState(true);
  const [busy, start] = useTransition();

  function agree() {
    start(async () => {
      await acknowledgeRecording();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="paper-grain sm:max-w-xl [&>button:last-child]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="bg-signal/10 text-signal grid size-10 place-items-center rounded-full">
          <Mic className="size-5" />
        </div>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Before your first call</DialogTitle>
          <DialogDescription>Three things to know, then you dial.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
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
        <div className="flex items-start gap-3">
          <Checkbox id="recording-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
          <Label htmlFor="recording-agree" className="cursor-pointer text-sm leading-snug font-normal">
            I understand my calls are recorded and shared with my workspace as described.
          </Label>
        </div>
        <Button size="lg" className="mt-2 w-full sm:w-auto sm:self-start" disabled={!agreed || busy} onClick={agree}>
          {busy ? "Saving…" : "Continue to the call"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
