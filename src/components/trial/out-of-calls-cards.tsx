"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackCta } from "@/components/analytics/cta-link";
import { EXTENSION, EXTENSION_DECIDERS, EXTENSION_TIMELINES, EXTENSION_USE_CASES, MANAGER_INTRO, managerIntroCopy, type ManagerIntroInput } from "@/content/trial-growth";
import { requestExtension, sendManagerIntro, type ExtensionState, type IntroState } from "@/app/(app)/practice/growth-actions";

export interface CardsProps {
  extension: { state: "open" } | { state: "pending"; since: string } | { state: "cooldown"; until: string };
  intros: { sentTo: { name: string; date: string }[] };
  /** Everything the preview needs except what the rep types. */
  preview: Omit<ManagerIntroInput, "managerName" | "note">;
}

/** Three ways forward, side by side, each a card that turns into a status line once used. */
export function OutOfCallsCards({ extension, intros, preview }: CardsProps) {
  const pathname = usePathname();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Earn calls" body="A LinkedIn post or an invited rep adds calls today.">
        <Button variant="outline" asChild><Link href="/rewards" onClick={() => trackCta("ooc_rewards", pathname, "/rewards")}>See rewards</Link></Button>
      </Card>
      <ExtensionCard extension={extension} pathname={pathname} />
      <IntroCard intros={intros} preview={preview} pathname={pathname} />
    </div>
  );
}

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-muted-foreground mt-1 text-sm">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function ExtensionCard({ extension, pathname }: { extension: CardsProps["extension"]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ExtensionState, FormData>(requestExtension, {});
  const invalid = (name: string) => (state.field === name ? true : undefined);
  const select = "border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm";

  if (state.done || extension.state === "pending") {
    return <Card title="Ask for more" body="Requested. We read every one and reply by email within a day."><span className="text-muted-foreground text-sm">Nothing else to do.</span></Card>;
  }
  if (extension.state === "cooldown") {
    return <Card title="Ask for more" body={`We answered a request from your workspace this week. You can ask again from ${extension.until}.`}><span className="text-muted-foreground text-sm">Check your email for the reply.</span></Card>;
  }
  if (!open) {
    return (
      <Card title="Ask for more" body={`Five quick questions. ${EXTENSION.usual}`}>
        <Button variant="outline" onClick={() => { setOpen(true); trackCta("ooc_extension_open", pathname); }}>Request</Button>
      </Card>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="bg-card space-y-3 rounded-2xl border p-5 md:col-span-3"
      noValidate
    >
      <div className="font-medium">Ask for more calls</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ex-use">What are you using the calls for?</Label>
          <select id="ex-use" name="use_case" defaultValue="" aria-invalid={invalid("use_case")} className={select} required>
            <option value="" disabled>Pick one</option>
            {EXTENSION_USE_CASES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-people">How many people would use it?</Label>
          <Input id="ex-people" name="people" type="number" inputMode="numeric" min={1} max={10000} aria-invalid={invalid("people")} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-decider">Who decides on tools like this for your team?</Label>
          <select id="ex-decider" name="decider" defaultValue="" aria-invalid={invalid("decider")} className={select} required>
            <option value="" disabled>Pick one</option>
            {EXTENSION_DECIDERS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-when">When would you decide?</Label>
          <select id="ex-when" name="timeline" defaultValue="" aria-invalid={invalid("timeline")} className={select} required>
            <option value="" disabled>Pick one</option>
            {EXTENSION_TIMELINES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ex-need">What would you need to see in the extra calls to decide? <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea id="ex-need" name="need" rows={2} maxLength={600} />
      </div>
      {state.error && <p className="text-destructive text-sm" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="signal" disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <span className="text-muted-foreground text-sm">{EXTENSION.usual} You'll get the number we settle on by email.</span>
      </div>
    </form>
  );
}

function IntroCard({ intros, preview, pathname }: { intros: CardsProps["intros"]; preview: CardsProps["preview"]; pathname: string }) {
  // The form is open for a given count of sent intros; a successful send raises the count and so closes it.
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState<IntroState, FormData>(sendManagerIntro, {});
  const invalid = (field: string) => (state.field === field ? true : undefined);
  const sent = [...intros.sentTo, ...(state.sentTo ? [{ name: state.sentTo, date: "just now" }] : [])];
  const canSend = sent.length < MANAGER_INTRO.maxPerRep;
  const open = openAt === sent.length;
  const setOpen = (v: boolean) => setOpenAt(v ? sent.length : null);

  if (!open) {
    const body = sent.length ? `Sent to ${sent.map((s) => s.name).join(", ")}. ${canSend ? "You can send it to someone else too." : ""}` : "We send them your progress and a link to the free trial, in your name. One email, no follow-ups.";
    return (
      <Card title="Show your manager" body={body}>
        {canSend ? <Button variant="outline" onClick={() => { setOpen(true); trackCta("ooc_intro_open", pathname); }}>{sent.length ? "Send to someone else" : "Send"}</Button> : <span className="text-muted-foreground text-sm">That's the limit.</span>}
      </Card>
    );
  }
  const copy = managerIntroCopy({ ...preview, managerName: name || "there", note: note || null });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="bg-card space-y-4 rounded-2xl border p-5 md:col-span-3"
      noValidate
    >
      <div className="font-medium">Show your manager</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="in-name">Manager's name</Label>
          <Input id="in-name" name="manager_name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={invalid("manager_name")} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="in-email">Their work email</Label>
          <Input id="in-email" name="manager_email" type="email" spellCheck={false} placeholder="name@company.com" aria-invalid={invalid("manager_email")} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="in-note">A line from you <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="in-note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Worth ten minutes before the next hire starts." />
      </div>
      <div className="bg-background rounded-xl border p-4 text-sm">
        <div className="text-muted-foreground mb-2 text-xs">This is the email, exactly. It goes from your name and replies come to you.</div>
        <div className="font-medium">{copy.subject}</div>
        {copy.lines.map((l, i) => <p key={i} className="mt-2">{l}</p>)}
        <p className="text-muted-foreground mt-2 text-xs">Then a button to the free trial, and a one-click way for them to say no to more emails.</p>
      </div>
      {state.error && <p className="text-destructive text-sm" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="signal" disabled={pending}>{pending ? "Sending…" : "Send it"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
