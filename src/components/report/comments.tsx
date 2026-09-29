"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment, type CommentState } from "@/app/(app)/sessions/[id]/actions";

export interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: string;
}

export function Comments({ sessionId, comments, viewerId, canDeleteAny, dateOf }: { sessionId: string; comments: CommentRow[]; viewerId: string; canDeleteAny: boolean; dateOf: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(addComment.bind(null, sessionId), {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      toast.success("Comment posted");
    }
  }, [state]);

  return (
    <section className="bg-card rounded-2xl border">
      <div className="border-b px-6 py-4">
        <h2 className="font-medium">Notes</h2>
        <p className="text-muted-foreground text-sm">Coaching notes on this call. The rep sees them on their dashboard.</p>
      </div>
      <div className="space-y-5 p-6">
        {comments.length === 0 && <p className="text-muted-foreground text-sm">No notes yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                <span>{c.author}</span>
                <span>{dateOf[c.id]}</span>
                {(c.author_id === viewerId || canDeleteAny) && (
                  <button type="button" className="hover:text-foreground underline underline-offset-4" onClick={() => deleteComment(c.id, sessionId)}>
                    delete
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        ))}
        <form ref={form} action={formAction} className="space-y-3 border-t pt-5">
          <Textarea name="body" placeholder="What should they take from this call?" maxLength={2000} required className="min-h-20" />
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Posting…" : "Post note"}</Button>
        </form>
      </div>
    </section>
  );
}
