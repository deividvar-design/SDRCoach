"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendFeedback } from "@/app/(app)/actions";

/** One box, one button. The page and who is writing are captured without asking. */
export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [replyOk, setReplyOk] = useState(true);
  const [busy, start] = useTransition();

  function submit() {
    start(async () => {
      const result = await sendFeedback({ body, page: pathname, replyOk });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Thanks. We read every one.");
      setBody("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>A bug, a wish, a prospect that felt off. It goes straight to the people building this.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened, or what would help?"
          rows={5}
          maxLength={4000}
          autoFocus
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim().length >= 3) submit();
          }}
        />
        <div className="flex items-center gap-2">
          <Checkbox id="feedback-reply" checked={replyOk} onCheckedChange={(v) => setReplyOk(v === true)} />
          <Label htmlFor="feedback-reply" className="cursor-pointer text-sm font-normal">You can email me back about this</Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || body.trim().length < 3}>{busy ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Sidebar row above the account menu. Owns its own open state. */
export function FeedbackLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
      >
        <MessageSquare className="size-4" />
        Send feedback
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
